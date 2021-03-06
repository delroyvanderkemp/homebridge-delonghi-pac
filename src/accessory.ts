import {AccessoryConfig, AccessoryPlugin, API, HAP, Logging, Service, Characteristic, CharacteristicEventTypes} from "homebridge";
const http = require('http');

let hap: HAP;

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("DelonghiPac", DelonghiPac);
};

class DelonghiPac implements AccessoryPlugin {

  private readonly log: Logging;
  private coolerService: Service;
  private dehumidifierService: Service;
  private fanService: Service;
  private informationService: Service;

  private fanState = {
    rotationSpeed: 3
  }

  private dictionary: { [characterName: string]: any};

  private state = {
    on: false, 
    temperature: "16",
    mode: 8, 
    fan: 2,
    timer: false,
    timer_value: "0", 
    unitF: false
  }

  private coolerState = {
    targetState: Characteristic.TargetHeaterCoolerState.COOL,
    targetTemperature: 20,
  }

  private currentTemperature = 0.0;

  private coolerTargetState: any;
  private coolerCurrentState: any;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    
    this.addServices(config);
    this.bindCoolerCharacteristics();
  }

  addServices(config: AccessoryConfig) {
    this.dictionary = {};
    this.dictionary["on"] = false;
    this.dictionary["temperature"] = "16";

    this.coolerService = new Service.HeaterCooler(config.name);
    this.dehumidifierService = new Service.HumidifierDehumidifier(config.name);
    this.fanService = new Service.Fanv2(config.name);

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer)
      .setCharacteristic(hap.Characteristic.Model, config.model)
      .setCharacteristic(hap.Characteristic.SerialNumber, config.serial);
  }

  bindCoolerCharacteristics() {
    this.coolerTargetState = this.coolerService.getCharacteristic(Characteristic.Active)
      .on(CharacteristicEventTypes.SET, (value: any, callback: any) => this.setProperties("on", value, callback))
      .on(CharacteristicEventTypes.GET, (callback: any) => this.getProperties("on", callback));

    this.coolerTargetState = this.coolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [Characteristic.TargetHeaterCoolerState.COOL]
      })
      .on(CharacteristicEventTypes.SET, this.setCoolerTargetState.bind(this))
      .on(CharacteristicEventTypes.GET, this.getCoolerTargetState.bind(this));

    this.coolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({
        maxValue: 32,
        minValue: 16,
        minStep: 1
      })
      .on(CharacteristicEventTypes.SET, (value: any, callback: any) => this.setProperties("temperature", value, callback))
      .on(CharacteristicEventTypes.GET, (callback: any) => this.getProperties("temperature", callback));

    this.coolerService.getCharacteristic(Characteristic.CurrentTemperature)
    .on(CharacteristicEventTypes.GET, this.getCoolerCurrentTemperature.bind(this));

    this.coolerCurrentState = this.coolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
    .setProps({
      validValues: [Characteristic.CurrentHeaterCoolerState.INACTIVE, Characteristic.CurrentHeaterCoolerState.COOLING]
    });
  }

  setProperties(key: string, value: any, callback: any) {
    this.dictionary[key] = value;

    this.coolerService.getCharacteristic(Characteristic.Active).updateValue(this.dictionary["on"]);
    this.coolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.dictionary["temperature"]);

    this.state = {
      on: this.dictionary["on"], 
      temperature: this.dictionary["temperature"],
      mode: 8, 
      fan: 2,
      timer: false,
      timer_value: "0", 
      unitF: false
    }
    
    this.post();
    callback();
  }

  getProperties(key: string, callback: any) {
    callback(null, this.dictionary[key])
  }

  setCoolerActive(active: any, callback: any) {
    this.state.on = active;
    callback();

    this.post();
  }

  getCoolerActive(callback: any) {
    callback(null, this.state.on);
  }

  setCoolerTargetState(targetState: any, callback: any) {
    this.log("Not setting cooler state to "+targetState);
    callback();
  }

  getCoolerTargetState(callback: any) {
    this.log("Getting cooler state of "+this.coolerState.targetState);
    callback(null, this.coolerState.targetState);
  }

  getCoolerCurrentTemperature(callback: any) {
    this.get();

    callback(null, this.currentTemperature);
  }

  setCoolerTargetTemperature(targetTemperature: any, callback: any) {
    this.log("Setting cooler temperature to "+targetTemperature+"°C");

    this.state.temperature = targetTemperature;
    callback();
    
    this.post();
  }

  getCoolerTargetTemperature(callback: any) {
    this.log("Getting cooler temperature of "+this.state.temperature+"°C");

    callback(null, this.state.temperature);
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.coolerService
    ];
  }

  post() {
    const data = JSON.stringify(this.state);
    this.log(JSON.stringify(data));

    const options = {
      hostname: '192.168.1.103',
      port: 80,
      path: '/remote',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    const req = http.request(options, (res: any) => {
      console.log(`statusCode: ${res.statusCode}`)
    
      res.on('data', (d: any) => {
        process.stdout.write(d)
      })
    })

    req.on('error', (error: any) => {
      console.error(error)
    })
    
    req.write(data)
    req.end()
  }

  get() {    
    http.get("http://192.168.1.103/status", (res: any) => {
      let body = "";
  
      res.on("data", (chunk: any) => {
          body += chunk;
      });
  
      res.on("end", () => {
          try {
              let json = JSON.parse(body);

              this.currentTemperature = json.temperature;
              this.coolerService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.currentTemperature);

              this.log(json.humidity);
          } catch (error) {
              console.error(error.message);
          };
      });
  
    }).on("error", (error: any) => {
        console.error(error.message);
    });
  }

  identify(): void {
  }
}