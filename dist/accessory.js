"use strict";
const homebridge_1 = require("homebridge");
const http = require('http');
let hap;
class DelonghiPac {
    constructor(log, config, api) {
        this.fanState = {
            rotationSpeed: 3
        };
        this.state = {
            on: false,
            temperature: "16",
            mode: 8,
            fan: 2,
            timer: false,
            timer_value: "0",
            unitF: false
        };
        this.coolerState = {
            targetState: homebridge_1.Characteristic.TargetHeaterCoolerState.COOL,
            targetTemperature: 20,
        };
        this.log = log;
        this.addServices(config);
        this.bindCoolerCharacteristics();
    }
    addServices(config) {
        this.coolerService = new homebridge_1.Service.HeaterCooler(config.name);
        this.dehumidifierService = new homebridge_1.Service.HumidifierDehumidifier(config.name);
        this.fanService = new homebridge_1.Service.Fanv2(config.name);
        this.informationService = new hap.Service.AccessoryInformation()
            .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer)
            .setCharacteristic(hap.Characteristic.Model, config.model)
            .setCharacteristic(hap.Characteristic.SerialNumber, config.serial);
    }
    bindCoolerCharacteristics() {
        this.coolerTargetState = this.coolerService.getCharacteristic(homebridge_1.Characteristic.Active)
            .on("set" /* SET */, this.setCoolerActive.bind(this))
            .on("get" /* GET */, this.getCoolerActive.bind(this));
        this.coolerTargetState = this.coolerService.getCharacteristic(homebridge_1.Characteristic.TargetHeaterCoolerState)
            .setProps({
            validValues: [homebridge_1.Characteristic.TargetHeaterCoolerState.COOL]
        })
            .on("set" /* SET */, this.setCoolerTargetState.bind(this))
            .on("get" /* GET */, this.getCoolerTargetState.bind(this));
        this.coolerService.getCharacteristic(homebridge_1.Characteristic.CoolingThresholdTemperature)
            .setProps({
            maxValue: 32,
            minValue: 16,
            minStep: 1
        })
            .on("set" /* SET */, this.setCoolerTargetTemperature.bind(this))
            .on("get" /* GET */, this.getCoolerTargetTemperature.bind(this));
        this.coolerService.getCharacteristic(homebridge_1.Characteristic.CurrentTemperature).updateValue(24);
        this.coolerCurrentState = this.coolerService.getCharacteristic(homebridge_1.Characteristic.CurrentHeaterCoolerState)
            .setProps({
            validValues: [homebridge_1.Characteristic.CurrentHeaterCoolerState.INACTIVE, homebridge_1.Characteristic.CurrentHeaterCoolerState.COOLING]
        });
    }
    setCoolerActive(active, callback) {
        this.state.on = active;
        callback();
        this.post();
    }
    getCoolerActive(callback) {
        callback(null, this.state.on);
    }
    setCoolerTargetState(targetState, callback) {
        this.log("Not setting cooler state to " + targetState);
        callback();
    }
    getCoolerTargetState(callback) {
        this.log("Getting cooler state of " + this.coolerState.targetState);
        callback(null, this.coolerState.targetState);
    }
    setCoolerTargetTemperature(targetTemperature, callback) {
        this.log("Setting cooler temperature to " + targetTemperature + "°C");
        this.state.temperature = targetTemperature;
        callback();
        this.post();
    }
    getCoolerTargetTemperature(callback) {
        this.log("Getting cooler temperature of " + this.state.temperature + "°C");
        callback(null, this.state.temperature);
    }
    getServices() {
        return [
            this.informationService,
            this.coolerService
        ];
    }
    post() {
        const data = JSON.stringify(this.state);
        this.log(JSON.stringify(data));
        const options = {
            hostname: '192.168.1.101',
            port: 80,
            path: '/remote',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        const req = http.request(options, (res) => {
            console.log(`statusCode: ${res.statusCode}`);
            res.on('data', (d) => {
                process.stdout.write(d);
            });
        });
        req.on('error', (error) => {
            console.error(error);
        });
        req.write(data);
        req.end();
    }
    identify() {
    }
}
module.exports = (api) => {
    hap = api.hap;
    api.registerAccessory("DelonghiPac", DelonghiPac);
};
//# sourceMappingURL=accessory.js.map