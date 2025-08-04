import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private socket = io('http://localhost:3000');

  getNetworkUpdates(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('networkUpdate', data => observer.next(data));
    });
  }
}