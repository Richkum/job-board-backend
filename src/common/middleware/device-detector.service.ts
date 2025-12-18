import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as DeviceDetector from 'device-detector-js';
import * as geoip from 'geoip-lite';

@Injectable()
export class DeviceDetectorService {
  private deviceDetector: DeviceDetector;
  private readonly logger = new Logger(DeviceDetectorService.name);

  constructor() {
    this.deviceDetector = new DeviceDetector();
  }

  getDeviceInfo(req: Request) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.getIpAddress(req);
    const device = this.deviceDetector.parse(userAgent);

    // Get location data from IP
    const geo = geoip.lookup(ip);
    this.logger.debug(`GeoIP lookup for ${ip}: ${JSON.stringify(geo)}`);

    // Always provide default coordinates [0,0] if none are available
    let coordinates: [number, number] = [0, 0];

    if (geo?.ll && Array.isArray(geo.ll) && geo.ll.length === 2) {
      coordinates = [geo.ll[0], geo.ll[1]];
      this.logger.debug(`Found coordinates: ${coordinates}`);
    } else {
      this.logger.debug(`Using default coordinates [0,0]`);
    }

    return {
      device: {
        name: this.getDeviceName(device),
        os: this.getOsInfo(device),
        browser: this.getBrowserInfo(device),
        type: this.getDeviceType(device),
      },
      ipAddress: ip,
      location: {
        country: geo?.country || '',
        city: geo?.city || '',
        coordinates: coordinates,
      },
    };
  }

  private getIpAddress(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor
      ? Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0]
      : req.socket.remoteAddress;
    return ip?.replace('::ffff:', '') || '127.0.0.1';
  }

  private getDeviceName(device: any): string {
    const clientName = device?.client?.name || 'Unknown Browser';
    const osName = device?.os?.name || 'Unknown OS';
    return `${clientName} on ${osName}`;
  }

  private getOsInfo(device: any): string {
    if (!device?.os) return 'Unknown OS';
    return `${device.os.name} ${device.os.version || ''}`.trim();
  }

  private getBrowserInfo(device: any): string {
    if (!device?.client) return 'Unknown Browser';
    return `${device.client.name} ${device.client.version || ''}`.trim();
  }

  private getDeviceType(device: any): 'mobile' | 'desktop' | 'tablet' | 'bot' {
    if (!device?.device) return 'desktop';

    if (device.bot) return 'bot';

    const type = device.device.type;
    if (type === 'smartphone') return 'mobile';
    if (type === 'tablet') return 'tablet';

    return 'desktop';
  }
}
