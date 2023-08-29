import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiurl = 'http://localhost:8080/tracker';
  constructor(private http: HttpClient) { }

  getData(path: any): Observable<any> {
    const url = `${this.apiurl}/${path}`;
    return this.http.get(url);
  }

  getGeoCountries(): Observable<any> {
    return this.http.get('https://unpkg.com/world-atlas@2.0.2/countries-50m.json');
  }
}
