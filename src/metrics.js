const config = require('./config');

module.exports = { sendMetricsPeriodically, 
    incrementPostRequests, incrementGetRequests, incrementPutRequests, incrementDeleteRequests,
    incrementActiveUsers, decrementActiveUsers,
    incrementSuccessAuthAttempts, incrementFailedAuthAttempts,
    incrementPizzasSold, incrementCreationFailures, incrementRevenue,
    addEndpointLatency, addPizzaLatency };

function sendMetricsPeriodically(period) {
setInterval(() => {
    try {
        const metrics = getMetrics();
        sendMetricsToGrafana(metrics);
    } catch (error) {
        console.log('Error sending metrics', error);
    }
}, period);
}

//system

const os = require('os');

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
    //console.log('post++');
    total_post_requests++;
}

function incrementGetRequests() {
    //console.log('get++');
    total_get_requests++;
}

function incrementPutRequests() {
    //console.log('put++');
    total_put_requests++;
}

function incrementDeleteRequests() {
    //console.log('delete++');
    total_delete_requests++;
}

//active users

let active_users = 0;

function incrementActiveUsers() {
    active_users++;
}

function decrementActiveUsers() {
    active_users--;
}

//auth attempts
success_auth_attempts = 0;
failed_auth_attempts = 0;

function incrementSuccessAuthAttempts() {
    success_auth_attempts++;
}

function incrementFailedAuthAttempts() {
    failed_auth_attempts++;
}

//pizza stats
let total_pizzas_sold = 0;
let total_creation_failures = 0;
let total_revenue = 0;

function incrementPizzasSold(amount = 1) {
    total_pizzas_sold += amount;
}

function incrementCreationFailures() {
    total_creation_failures++;
}

function incrementRevenue(amount) {
    total_revenue += amount;
}

//latency
let endpoint_latencies = [];
let pizza_latencies = [];

function addEndpointLatency(latency) {
    endpoint_latencies.push(latency);
}

function addPizzaLatency(latency) {
    pizza_latencies.push(latency);
}

function getAverageEndpointLatency() {
    if (endpoint_latencies.length === 0) {
        return 0;
    }
    const sum = endpoint_latencies.reduce((a, b) => a + b, 0);
    return sum / endpoint_latencies.length;
}

function getAveragePizzaLatency() {
    if (pizza_latencies.length === 0) {
        return 0;
    }
    const sum = pizza_latencies.reduce((a, b) => a + b, 0);
    return sum / pizza_latencies.length;
}

function clearLatencies() {
    endpoint_latencies = [];
    pizza_latencies = [];
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
        },
        {
            "name": "active_users",
            "unit": "count",
            "gauge": {
                "dataPoints": [
                    {
                        "asInt": active_users,
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
            "name": "success_auth_attempts",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": success_auth_attempts,
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
            "name": "failed_auth_attempts",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": failed_auth_attempts,
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
            "name": "pizzas_sold",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_pizzas_sold,
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
            "name": "creation_failures",
            "unit": "count",
            "sum": {
                "dataPoints": [
                    {
                        "asInt": total_creation_failures,
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
            "name": "revenue",
            "unit": "₿",
            "sum": {
                "dataPoints": [
                    {
                        "asDouble": total_revenue,
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
            "name": "endpoint_latency",
            "unit": "ms",
            "gauge": {
                "dataPoints": [
                    {
                        "asDouble": getAverageEndpointLatency(),
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
            "name": "pizza_latency",
            "unit": "ms",
            "gauge": {
                "dataPoints": [
                    {
                        "asDouble": getAveragePizzaLatency(),
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
        }
    ];
    clearLatencies();
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