import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { logger } from './logger';

// Initialize OpenTelemetry Node SDK
const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(), // Exports traces to console logs for local/CI observability
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
  logger.info('OpenTelemetry initialized successfully');
} catch (error) {
  logger.error('Failed to initialize OpenTelemetry', { error });
}

// Gracefully shut down SDK on process termination
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
    .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', { error }))
    .finally(() => process.exit(0));
});
