import sys, threading, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ai-cast'))
from cinematic_transport import protect_stream


class TransportTests(unittest.TestCase):
    def client(self):
        return SimpleNamespace(pending_lock=threading.Lock(),pending_event_ids={'same-event'})

    def test_disconnected_stream_reopens_same_event_without_resubmitting_gpu(self):
        client=self.client();reads=[];pause=Mock()
        def stream(protocol,session_hash):
            reads.append((protocol,session_hash,tuple(client.pending_event_ids)))
            if len(reads)==3:client.pending_event_ids.clear()
        client.stream_messages=stream
        submit=Mock(side_effect=lambda:client.stream_messages('sse_v3',session_hash='same-session'))
        protect_stream(client,pause=pause)
        submit()
        submit.assert_called_once()
        self.assertEqual(len(reads),3)
        self.assertTrue(all(r==reads[0] for r in reads))
        self.assertEqual(pause.call_count,2)

    def test_exhausted_read_reconnects_stay_uncertain_without_inference_retry(self):
        client=self.client();reader=Mock();client.stream_messages=reader
        protect_stream(client,pause=Mock())
        with self.assertRaisesRegex(RuntimeError,'outcome uncertain'):
            client.stream_messages('sse_v3',session_hash='one-session')
        self.assertEqual(reader.call_count,4)
        self.assertEqual(client.pending_event_ids,{'same-event'})

    def test_completed_stream_is_read_once_and_provider_error_is_not_replayed(self):
        client=self.client();client.pending_event_ids.clear();reader=Mock();client.stream_messages=reader
        protect_stream(client,pause=Mock());protect_stream(client)
        client.stream_messages('sse_v3','one-session');reader.assert_called_once()
        client=self.client();reader=Mock(side_effect=ValueError('provider failure'));client.stream_messages=reader
        protect_stream(client,pause=Mock())
        with self.assertRaisesRegex(ValueError,'provider failure'):client.stream_messages('sse_v3','one-session')
        reader.assert_called_once()

    def test_socket_read_failure_reconnects_the_result_only(self):
        client=self.client();calls=[]
        def reader(*args,**kwargs):
            calls.append(1)
            if len(calls)==1:raise ConnectionError("socket closed")
            client.pending_event_ids.clear()
        client.stream_messages=reader
        protect_stream(client,pause=Mock())
        client.stream_messages("sse_v3","one-session")
        self.assertEqual(len(calls),2)

    def test_unrecognized_transport_stops_before_submission(self):
        with self.assertRaisesRegex(RuntimeError,'no GPU submission'):protect_stream(SimpleNamespace())


if __name__=='__main__':unittest.main()
