import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SimulationService } from './simulation.service';
import * as cytoscape from 'cytoscape';
import { Chart } from 'chart.js'; // ✅ Import Chart.js

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  nodes: any[] = [];
  links: any[] = [];
  cy: any;

  constructor(private simService: SimulationService) {}

  ngOnInit() {
    this.simService.getNetworkUpdates().subscribe((data: any) => {
      this.nodes = data.nodes;

      // Ensure consistent naming + add metrics if not provided
      this.links = (data.links as any[]).map(l => ({
        source: l.source ?? l.from,
        target: l.target ?? l.to,
        load: l.load ?? 0,
        capacity: l.capacity ?? 1,
        latency: l.latency ?? Math.floor(Math.random() * 100),
        packetLoss: l.packetLoss ?? parseFloat((Math.random() * 5).toFixed(2)),
        jitter: l.jitter ?? Math.floor(Math.random() * 20)
      }));

      this.updateGraph();
      this.updateCharts(); // ✅ Call chart update whenever new data comes
    });
  }

  ngAfterViewInit() {
    // ✅ Initialize Cytoscape
    this.cy = cytoscape({
      container: document.getElementById('cy'),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#0074d9',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'font-size': 10
          }
        },
        // Dynamic edge color based on load ratio
        { selector: 'edge[loadRatio < 0.7]', style: { 'line-color': 'green', 'target-arrow-color': 'green' } },
        { selector: 'edge[loadRatio >= 0.7][loadRatio < 1]', style: { 'line-color': 'orange', 'target-arrow-color': 'orange' } },
        { selector: 'edge[loadRatio >= 1]', style: { 'line-color': 'red', 'target-arrow-color': 'red' } }
      ],
      layout: { name: 'circle' }
    });

    // ✅ Initialize charts after DOM is ready
    setTimeout(() => this.updateCharts(), 500);
  }

  updateGraph() {
    if (!this.cy) return;

    // Remove old elements
    this.cy.elements().remove();

    // Add nodes
    const nodeElements = this.nodes.map(n => ({
      data: { id: n.id, label: `${n.id} (${n.queue})` }
    }));

    // Add edges with calculated load ratio & metrics in label
    const edgeElements = this.links.map(l => ({
      data: {
        source: l.source,
        target: l.target,
        label: `${l.load}/${l.capacity} pps | Lat: ${l.latency}ms | Loss: ${l.packetLoss}% | Jitter: ${l.jitter}ms`,
        loadRatio: l.capacity > 0 ? l.load / l.capacity : 1
      }
    }));

    this.cy.add([...nodeElements, ...edgeElements]);
    this.cy.layout({ name: 'circle' }).run();
  }

  // ✅ CHART.JS MINI-GRAPH LOGIC
  updateCharts() {
    this.links.forEach((link, i) => {
      const canvas = document.getElementById('linkChart' + i) as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['T-4', 'T-3', 'T-2', 'T-1', 'Now'],
          datasets: [{
            data: this.generateRandomData(link.load),
            borderColor: this.getLinkColor(link),
            backgroundColor: this.getLinkColor(link),
            fill: false,
            tension: 0.3
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    });
  }

  generateRandomData(base: number) {
    return Array.from({ length: 5 }, () => base + Math.floor(Math.random() * 10 - 5));
  }

  getLinkColor(link: any) {
    const ratio = link.load / link.capacity;
    if (ratio < 0.7) return 'green';
    if (ratio < 1) return 'orange';
    return 'red';
  }
}
