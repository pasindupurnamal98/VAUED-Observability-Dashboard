const http = require('http')
const url = require('url');
const client = require('prom-client')

const register = new client.Registry()

register.setDefaultLabels({
  app: 'vaued-nodejs-app'
});

client.collectDefaultMetrics({ register });


const httpRequestDurationMicroseconds = new client.Histogram({ // track the duration of HTTP requests,
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // 0.1 to 10 seconds
})

register.registerMetric(httpRequestDurationMicroseconds)

const createRequestHandler = async (req, res) => {
  // return an error 1% of the time
  if ((Math.floor(Math.random() * 100)) === 0) {
    throw new Error('Internal Error')
  }

  // delay for 3-6 seconds
  const delaySeconds = Math.floor(Math.random() * (6 - 3)) + 3
  await new Promise(res => setTimeout(res, delaySeconds * 1000))

  res.end('Request processed successfully');
}

// async function returning error in 3-6 seconds
const errorRequestHandler = async () => {
  // delay for 3-6 seconds
  const delaySeconds = Math.floor(Math.random() * (6 - 3)) + 3
  await new Promise(res => setTimeout(res, delaySeconds * 1000))
  throw new Error('Internal Error')
}


const server = http.createServer(async (req, res) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  const route = url.parse(req.url).pathname;

  try {
      if (route === '/metrics') { //Exposes the collected metrics for Prometheus to scrape.
        res.setHeader('Content-Type', register.contentType)
        res.end(register.metrics())
      }

      if (route === '/error') { //Simulates an error scenario
        await errorRequestHandler()
      }

      if (route === '/') {
        await createRequestHandler(req, res)
      }

  } catch (error) {
    res.writeHead(500).end()
  }

  if (!res.finished) {
    res.writeHead(404).end() // Default 404 handler
  }

  end({ route, code: res.statusCode, method: req.method })
})

server.listen(8080, () => { //The server listens on http://localhost:8080
  console.log('Server is running on http://localhost:8080, metrics are exposed on http://localhost:8080/metrics') //etrics are exposed at localhost:8080/metrics
})
