const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ===== Simulation Data =====

// Nodes
let nodes = [
    { id: 'A', queue: 0, rate: 0 },
    { id: 'B', queue: 0, rate: 0 },
    { id: 'C', queue: 0, rate: 0 },
    { id: 'D', queue: 0, rate: 0 },
    { id: 'E', queue: 0, rate: 0 },
];

// Links with capacities
let links = [
    { from: 'A', to: 'B', capacity: 100, load: 0 },
    { from: 'A', to: 'C', capacity: 80, load: 0 },
    { from: 'B', to: 'C', capacity: 70, load: 0 },
    { from: 'C', to: 'D', capacity: 90, load: 0 },
    { from: 'C', to: 'E', capacity: 100, load: 0 },
    { from: 'D', to: 'E', capacity: 60, load: 0 },
];

// Traffic generation rates (packets/sec)
const trafficRates = { A: 50, B: 30, C: 40, D: 20, E: 60 };

// ===== Shortest Path (BFS) =====
function shortestPath(start, end) {
    let graph = {};
    links.forEach(link => {
        if (!graph[link.from]) graph[link.from] = [];
        if (!graph[link.to]) graph[link.to] = [];
        graph[link.from].push(link.to);
        graph[link.to].push(link.from);
    });

    let queue = [[start]];
    let visited = new Set();

    while (queue.length > 0) {
        let path = queue.shift();
        let node = path[path.length - 1];
        if (node === end) return path;
        if (!visited.has(node)) {
            visited.add(node);
            (graph[node] || []).forEach(neighbor => {
                let newPath = [...path, neighbor];
                queue.push(newPath);
            });
        }
    }
    return null;
}

// ===== Simulation Logic =====
function simulateStep() {
    // Generate packets at each node
    nodes.forEach(node => {
        node.rate = trafficRates[node.id];
        node.queue += node.rate;
    });

    // Send packets between random source & destination
    nodes.forEach(sourceNode => {
        let destinations = nodes.filter(n => n.id !== sourceNode.id);
        let destNode = destinations[Math.floor(Math.random() * destinations.length)];
        let path = shortestPath(sourceNode.id, destNode.id);

        if (path) {
            for (let i = 0; i < path.length - 1; i++) {
                let link = links.find(l =>
                    (l.from === path[i] && l.to === path[i + 1]) ||
                    (l.to === path[i] && l.from === path[i + 1])
                );

                if (link) {
                    let packetsToSend = Math.min(sourceNode.queue, link.capacity - link.load);
                    if (packetsToSend > 0) {
                        link.load += packetsToSend;
                        sourceNode.queue -= packetsToSend;
                    }
                }
            }
        }
    });

    // Emit update to frontend
    io.emit("networkUpdate", { nodes, links });

    // Reset link loads for next second
    links.forEach(link => link.load = 0);
}

setInterval(simulateStep, 1000);

// API
app.get("/api/nodes", (req, res) => res.json(nodes));
app.get("/api/links", (req, res) => res.json(links));

server.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
});