const config = require('./config');

module.exports = { sendMetricsPeriodically, incrementPostRequests, incrementGetRequests, incrementPutRequests, incrementDeleteRequests };

function sendMetricsPeriodically(period) {
const timer = setInterval(() => {
    try {

        //add some random requests
        // for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
        //     incrementPostRequests();
        // }
        // for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
        //     incrementGetRequests();
        // }
        // for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
        //     incrementPutRequests();
        // }
        // for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
        //     incrementDeleteRequests();
        // }
        ////end random requests

        const metrics = getMetrics();
        sendMetricsToGrafana(metrics);
    } catch (error) {
        console.log('Error sending metrics', error);
    }
}, period);
}

//system

const os = require('os');
const { send } = require('vite');
const { metrics } = require('./config');

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}

//traffic

let total_post_requests = 0;
let total_get_requests = 0;
let total_put_requests = 0;
let total_delete_requests = 0;

function incrementPostRequests() {
    console.log('post++');
    total_post_requests++;
}

function incrementGetRequests() {
    console.log('get++');
    total_get_requests++;
}

function incrementPutRequests() {
    console.log('put++');
    total_put_requests++;
}

function incrementDeleteRequests() {
    console.log('delete++');
    total_delete_requests++;
}

//util

function getMetrics() {
    //otel metrics
    const metrics = [
        {
            "name": "cpu",
            "unit": "%",
            "gauge": {
                "dataPoints": [
                    {
                        "asDouble": getCpuUsagePercentage(),
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ]
            }
        },
        {
            "name": "memory",
            "unit": "%",
            "gauge": {
                "dataPoints": [
                    {
                        "asDouble": getMemoryUsagePercentage(),
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ]
            }
        },
        {
            "name": "post_requests",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_post_requests,
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ],
                "aggregationTemporality": 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                "isMonotonic": true
            }
        },
        {
            "name": "get_requests",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_get_requests,
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ],
                "aggregationTemporality": 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                "isMonotonic": true
            }
        },
        {
            "name": "put_requests",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_put_requests,
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ],
                "aggregationTemporality": 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                "isMonotonic": true
            }
        },
        {
            "name": "delete_requests",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_delete_requests,
                        "timeUnixNano": Date.now() * 1000000,
                        "attributes": [
                            {
                                "key": "source",
                                "value": { "stringValue": config.metrics.source }
                            }
                        ]
                    }
                ],
                "aggregationTemporality": 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                "isMonotonic": true
            }
        }
    ];
    return metrics;
}

function sendMetricsToGrafana(metrics) {
    const otel = {
      "resourceMetrics": [
        {
          "scopeMetrics": [
            {
              "metrics": 
                metrics,
            },
          ],
        },
      ],
    };
    
    const body = JSON.stringify(otel);
    fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
    .then((response) => {
        if (!response.ok) {
        response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana: ${text}`);
        });
        } else {
        console.log(`Pushed metrics data to Grafana`);
        }
    })
    .catch((error) => {
        console.error('Error pushing metrics:', error);
    });
}