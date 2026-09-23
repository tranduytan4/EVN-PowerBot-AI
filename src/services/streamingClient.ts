export interface SSEEventHandlers {
  onInit?: (data: { thread_id: string; question: string; customer_id?: string; timestamp: string }) => void;
  onCacheHit?: (data: { matched_question: string; similarity: number; latency_saved_ms: number; message: string }) => void;
  onNodeStart?: (data: { node: string; description: string; timestamp: string; duration_ms: number }) => void;
  onToolCall?: (data: { node: string; tool: string; input: any; observation: any }) => void;
  onStateDiff?: (data: { node: string; state_delta: any; decision?: string }) => void;
  onToken?: (data: { token: string; accumulated: string; is_cached: boolean }) => void;
  onInterrupt?: (data: { thread_id: string; status: string; next_nodes: string[]; reason: string; state: any; trace: any[] }) => void;
  onDone?: (data: { thread_id: string; status: string; is_paused: boolean; is_cached: boolean; state: any; answer: string; trace: any[]; metrics: any }) => void;
  onError?: (error: Error) => void;
}

export class SSEStreamingClient {
  private abortController: AbortController | null = null;

  public async startStream(
    url: string,
    payload: { question: string; thread_id?: string; customer_id?: string },
    handlers: SSEEventHandlers
  ): Promise<void> {
    this.abort(); // Cancel previous stream if active
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by double newline which terminates SSE messages
        const events = buffer.split('\n\n');
        // Keep the last partial event chunk in the buffer
        buffer = events.pop() || '';

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          const lines = eventStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.replace('data:', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const parsedData = JSON.parse(dataStr);
            this.dispatchEvent(eventType, parsedData, handlers);
          } catch (e) {
            console.warn('[SSEStreamingClient] Failed to parse SSE event data:', dataStr, e);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stream aborted gracefully
        return;
      }
      if (handlers.onError) {
        handlers.onError(err);
      } else {
        console.error('[SSEStreamingClient] Stream error:', err);
      }
    } finally {
      this.abortController = null;
    }
  }

  private dispatchEvent(eventType: string, data: any, handlers: SSEEventHandlers): void {
    switch (eventType) {
      case 'init':
        handlers.onInit?.(data);
        break;
      case 'cache_hit':
        handlers.onCacheHit?.(data);
        break;
      case 'node_start':
        handlers.onNodeStart?.(data);
        break;
      case 'tool_call':
        handlers.onToolCall?.(data);
        break;
      case 'state_diff':
        handlers.onStateDiff?.(data);
        break;
      case 'token':
        handlers.onToken?.(data);
        break;
      case 'interrupt':
        handlers.onInterrupt?.(data);
        break;
      case 'done':
        handlers.onDone?.(data);
        break;
      case 'error':
        handlers.onError?.(new Error(data.error || 'Server stream error'));
        break;
      default:
        console.log(`[SSEStreamingClient] Unhandled event: ${eventType}`, data);
    }
  }

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const streamingClient = new SSEStreamingClient();
