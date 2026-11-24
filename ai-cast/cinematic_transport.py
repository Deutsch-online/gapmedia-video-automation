"""Reconnect only the existing Gradio result stream; never resubmit inference."""
import time


def protect_stream(client, reconnects=3, pause=time.sleep):
    """Keep Gradio's single submit/reservation while reopening read-only SSE GETs.

    Gradio turns an ended result stream into CancelledError even when the remote
    prediction may still be running. Reconnect before its done callback appends
    the cancellation sentinel. Exhaustion stays uncertain and is never replayed.
    """
    if getattr(client, '_gapmedia_stream_protected', False):
        return client
    original = getattr(client, 'stream_messages', None)
    if not callable(original) or not hasattr(client, 'pending_event_ids') or not hasattr(client, 'pending_lock'):
        raise RuntimeError('Unsupported Gradio result-stream contract; no GPU submission')

    def read_existing(*args, **kwargs):
        for attempt in range(reconnects + 1):
            # The original reader handles its transport disconnect. Provider
            # exceptions and explicit cancellation are never retried here.
            try:
                original(*args, **kwargs)
            except Exception as exc:
                transport_error = isinstance(exc, (OSError, TimeoutError)) or any(
                    base.__name__ == "TransportError" and base.__module__.startswith("httpx")
                    for base in type(exc).__mro__)
                if not transport_error:
                    raise
            with client.pending_lock:
                active = bool(client.pending_event_ids)
            if not active:
                return
            if attempt == reconnects:
                raise RuntimeError('Remote result stream unavailable after bounded read-only reconnects; outcome uncertain, do not resubmit')
            print('Reconnecting existing GPU result stream; no new generation submitted.', flush=True)
            pause(min(2 ** attempt, 4))

    client.stream_messages = read_existing
    client._gapmedia_stream_protected = True
    return client
