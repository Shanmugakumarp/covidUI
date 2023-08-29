import { Component, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { ChoroplethController, GeoFeature, ColorScale, ProjectionScale, topojson } from 'chartjs-chart-geo';

import { ConfigService } from '../shared/config.service';
import * as moment from 'moment';
Chart.register(ChoroplethController, GeoFeature, ColorScale, ProjectionScale);

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {
  private caseChart: Chart | undefined;
  public total: any = {
    new_cases: 0,
    new_deaths: 0
  }
  private caseList: any = {};
  private deathchart: Chart | undefined;
  private geochart: Chart | undefined;
  public skeleton: any = {
    new_cases: false,
    new_deaths: false,
    map: false,
    list: false
  }
  public innerHeight: Number = (window.innerHeight - 140);
  public formOptions: any = {
    type: [{
      name: 'New',
      id: 'new'
    }, {
      name: 'Cumulative',
      id: 'cumulative'
    }],
    case: [
      {
        name: 'Positive Cases',
        id: 'positive'
      }, {
        name: 'Deaths',
        id: 'deaths'
      }
    ]
  };
  countryWiseList: any = [];

  constructor(private configService: ConfigService) {}
  
  public formModel: any = {
    type: 'new',
    case: 'positive'
  }

  ngOnInit(): void {
    this.skeleton['map'] = true;
    this.skeleton['list'] = true;
    this.loadChart('new_cases', 'new_cases');
    this.loadChart('new_deaths', 'new_deaths');
  }

  loadChart(type: any, api:any) {
    this.skeleton[type] = true;

    this.configService.getData(`listcases?type=${api}`).subscribe(res => {
      let caseList = res.map((ritem: any) => {
        let newD = ritem.date?.split('-');
        return {
          ...ritem,
          date: `${newD[2]}-${newD[1]}-${newD[0]}`
        }
      }).filter((x:any) => x.date !== 'Invalid date');

      this.caseList[type] = caseList;

      if ((this.formModel['case'] === 'positive' && type === 'new_cases') ||
        (this.formModel['case'] === 'deaths' && type === 'new_deaths')) {
          this.wrapCountryData(api);
        }
      
      let _data:any = [];
      caseList.forEach((item:any) => {
        const findIndex = _data?.findIndex((x: any) => x.date == item.date);
        if(findIndex === -1) 
        _data.push({date: item.date, [api]: item[api]});
        else
        _data[findIndex] = {..._data[findIndex], [api]: item[api] + _data[findIndex][api]}
      });
      
      const ctx = document.getElementById(type) as HTMLCanvasElement;
      const dates = _data.map((item: any) => item.date);
      let cumulative = 0;
      const values = _data.map((item: any) => {
        cumulative = cumulative + item[api];
        return item[api]
      });
      this.total[type] = cumulative;

      let chartConfig: any =  {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            data: values,
            borderColor: '#00b7f2',
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
           },
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'month',
                displayFormats: {
                  month: 'MMM YYYY'
                },
                tooltipFormat: 'DD MMM YYYY'
              },
              title: {
                display: false,
                text: 'Date and Month'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: false,
                text: 'Value'
              }
            }
          }
        }
      }

      if (type === 'new_cases')
        this.caseChart = new Chart(ctx, chartConfig);
      else
        this.deathchart = new Chart(ctx, chartConfig);

      this.skeleton[type] = false;
      console.log(_data);
    },err => {
      console.log(err);
    })
  }

  wrapCountryData(type: any) {
    let _data:any = [];

    this.caseList[this.formModel['case'] === 'positive' ? 'new_cases' : 'new_deaths'].forEach((item:any) => {
      const findIndex = _data?.findIndex((x: any) => x.country == item.country);
      if(findIndex === -1) 
      _data.push({country: item.country, count: item[type]});
      else
      _data[findIndex] = {..._data[findIndex], count: item[type] + _data[findIndex]['count']}
    });
    _data = _data.sort((a: any, b: any) => b.count - a.count);

    const highestValue = _data[0]['count'];
    this.countryWiseList = _data.map((item: any) => {
      return {
        ...item,
        percentage: `calc(${Math.round((item.count/highestValue) * 100)}% - 200px)`
      }
    })
    console.log("Country", _data);
    this.skeleton['list'] = false;
    this.geoMap(_data);
  }

  geoMap(_data: any) {
    this.configService.getGeoCountries().subscribe(data => {
      let countries: any = topojson.feature(
        data,
        data.objects.countries
      );
      let country = countries['features'];

      //Replace US to Unites States of America due to miss spelled in DB.
      _data = _data.map((d: any) => {
        if (d.country === 'US')
          d.country = 'United States of America'
        return d
      })

      let labels = country.map((d: any) => d.properties.name);
      let dataset = country.map((d : any) => {
        let cIndex = _data.findIndex((x : any) => x.country === d.properties.name);
        return {
          feature: d,
          value: cIndex > -1 ? _data[cIndex]['count'] : 0
        }
      });
    const ctx = document.getElementById('geoChart') as HTMLCanvasElement;

      this.geochart = new Chart(ctx, {
        type: "choropleth",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Countries",
              data: dataset
            }
          ]
        },
        options: {
          showOutline: true,
          showGraticule: true,
          plugins: {
            legend: {
              display: false
            },
          },
          scales: {
            projection: {
              axis: 'x',
              projection: 'equalEarth'
            }
          }
        }
      });

    }, err =>{
      console.log(err)
    });
    this.skeleton['map'] = false;
  }

  onChange(value: any) {
    this.skeleton['map'] = true;
    this.skeleton['list'] = true;
    if(value === 'case') {
      this.geochart?.destroy();
      this.countryWiseList = [];
      let api = ''

      if (this.formModel['type'] === 'cumulative')
        api = this.formModel['case'] === 'deaths' ? 'deaths' : 'confirmed'
      else api = this.formModel['case'] === 'deaths' ? 'new_deaths' : 'new_cases'

      this.wrapCountryData(api);
      return;
    }
     this.caseChart?.destroy();
     this.deathchart?.destroy();
     this.geochart?.destroy();
     this.countryWiseList = [];
     this.loadChart('new_cases', this.formModel[value] === 'new' ? 'new_cases': 'confirmed');
     this.loadChart('new_deaths', this.formModel[value] === 'new' ? 'new_deaths': 'deaths');
  }

}
