use std::cell::OnceCell;
use std::sync::mpsc::{self, SyncSender};
use std::time::Duration;

use block2::RcBlock;
use dispatch2::DispatchQueue;
use objc2::rc::{Allocated, Retained};
use objc2::runtime::NSObject;
use objc2::{define_class, msg_send, AnyThread, ClassType, DefinedClass, Message};
use objc2_core_audio_types::{AudioBuffer, AudioBufferList};
use objc2_core_media::CMSampleBuffer;
use objc2_foundation::{NSArray, NSDate, NSError, NSObjectProtocol, NSRunLoop};
use objc2_screen_capture_kit::{
    SCContentFilter, SCRunningApplication, SCShareableContent, SCStream, SCStreamConfiguration,
    SCStreamOutput, SCStreamOutputType, SCWindow,
};

use crate::{write_frame, write_pcm_loop};

struct OutputIvars {
    tx: OnceCell<SyncSender<Vec<f32>>>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "AudireCaptureOutput"]
    #[ivars = OutputIvars]
    struct CaptureOutput;

    unsafe impl NSObjectProtocol for CaptureOutput {}

    unsafe impl SCStreamOutput for CaptureOutput {
        #[unsafe(method(stream:didOutputSampleBuffer:ofType:))]
        fn did_output(
            &self,
            _stream: &SCStream,
            sample: &CMSampleBuffer,
            of_type: SCStreamOutputType,
        ) {
            if of_type != SCStreamOutputType::Audio {
                return;
            }
            let Some(tx) = self.ivars().tx.get() else {
                return;
            };
            if let Some(pcm) = audio_from_sample(sample) {
                let _ = tx.send(pcm);
            }
        }
    }
);

impl CaptureOutput {
    fn with_sender(tx: SyncSender<Vec<f32>>) -> Retained<Self> {
        let this: Allocated<Self> = Self::alloc();
        let this = this.set_ivars(OutputIvars {
            tx: OnceCell::new(),
        });
        let this: Retained<Self> = unsafe { msg_send![super(this), init] };
        let _ = this.ivars().tx.set(tx);
        this
    }
}

pub fn capture_app(pid_s: &str) -> Result<(), String> {
    let pid: i32 = pid_s.parse().map_err(|_| "bad app pid".to_string())?;
    let content = shareable_content()?;
    let display = unsafe { content.displays() }
        .into_iter()
        .next()
        .ok_or_else(|| "no display".to_string())?;
    let apps = unsafe { content.applications() };
    let app = apps
        .into_iter()
        .find(|app| unsafe { app.processID() } == pid)
        .ok_or_else(|| "app not found".to_string())?;
    let excepting: Retained<NSArray<SCWindow>> = NSArray::new();
    let included: Retained<NSArray<SCRunningApplication>> = NSArray::from_retained_slice(&[app]);
    let filter = unsafe {
        SCContentFilter::initWithDisplay_includingApplications_exceptingWindows(
            SCContentFilter::alloc(),
            &display,
            &included,
            &excepting,
        )
    };
    let config = unsafe { SCStreamConfiguration::new() };
    unsafe {
        config.setWidth(64);
        config.setHeight(64);
        config.setCapturesAudio(true);
        config.setSampleRate(48_000);
        config.setChannelCount(2);
        config.setExcludesCurrentProcessAudio(true);
    }
    let (tx, rx) = mpsc::sync_channel::<Vec<f32>>(16);
    let output = CaptureOutput::with_sender(tx);
    let stream = unsafe {
        SCStream::initWithFilter_configuration_delegate(SCStream::alloc(), &filter, &config, None)
    };
    let queue = DispatchQueue::new("audire.sck", None);
    unsafe {
        stream
            .addStreamOutput_type_sampleHandlerQueue_error(
                objc2::runtime::ProtocolObject::from_ref(&*output),
                SCStreamOutputType::Audio,
                Some(&queue),
            )
            .map_err(|e| e.to_string())?;
    }
    start_capture(&stream)?;
    let _keep = (stream, output, filter, config, included);
    write_pcm_loop(rx, 48_000, 2)
}

fn shareable_content() -> Result<Retained<SCShareableContent>, String> {
    let (tx, rx) = mpsc::channel();
    let tx2 = tx.clone();
    let block = RcBlock::new(move |content: *mut SCShareableContent, err: *mut NSError| {
        if !err.is_null() {
            let err = unsafe { &*err };
            let _ = tx.send(Err(err.to_string()));
            return;
        }
        if content.is_null() {
            let _ = tx.send(Err("no shareable content".into()));
            return;
        }
        let retained = unsafe { Retained::retain(content) };
        match retained {
            Some(content) => {
                let _ = tx.send(Ok(content));
            }
            None => {
                let _ = tx.send(Err("retain failed".into()));
            }
        }
    });
    unsafe {
        SCShareableContent::getShareableContentWithCompletionHandler(&block);
    }
    let _ = tx2;
    wait_result(rx)
}

fn start_capture(stream: &SCStream) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();
    let block = RcBlock::new(move |err: *mut NSError| {
        if err.is_null() {
            let _ = tx.send(Ok(()));
        } else {
            let err = unsafe { &*err };
            let _ = tx.send(Err(err.to_string()));
        }
    });
    unsafe {
        stream.startCaptureWithCompletionHandler(Some(&block));
    }
    wait_result(rx)
}

fn wait_result<T>(rx: mpsc::Receiver<Result<T, String>>) -> Result<T, String> {
    let run_loop = unsafe { NSRunLoop::currentRunLoop() };
    let deadline = std::time::Instant::now() + Duration::from_secs(8);
    loop {
        if let Ok(value) = rx.try_recv() {
            return value;
        }
        if std::time::Instant::now() > deadline {
            return Err("ScreenCaptureKit timed out (grant Screen Recording)".into());
        }
        let date = unsafe { NSDate::dateWithTimeIntervalSinceNow(0.05) };
        unsafe {
            run_loop.runUntilDate(&date);
        }
    }
}

fn audio_from_sample(sample: &CMSampleBuffer) -> Option<Vec<f32>> {
    let mut size = 0usize;
    let status = unsafe {
        sample.audio_buffer_list_with_retained_block_buffer(
            &mut size,
            std::ptr::null_mut(),
            0,
            None,
            None,
            0,
            std::ptr::null_mut(),
        )
    };
    if status != 0 || size == 0 {
        return None;
    }
    let mut storage = vec![0u8; size];
    let list = storage.as_mut_ptr().cast::<AudioBufferList>();
    let mut block: *mut objc2_core_media::CMBlockBuffer = std::ptr::null_mut();
    let status = unsafe {
        sample.audio_buffer_list_with_retained_block_buffer(
            std::ptr::null_mut(),
            list,
            size,
            None,
            None,
            0,
            &mut block,
        )
    };
    if status != 0 {
        return None;
    }
    let list = unsafe { &*list };
    let n = list.mNumberBuffers as usize;
    let buffers = unsafe { std::slice::from_raw_parts(list.mBuffers.as_ptr(), n.max(1)) };
    let samples = buffers_to_interleaved(buffers);
    if !block.is_null() {
        let _ = unsafe { Retained::from_raw(block) };
    }
    samples
}

fn buffers_to_interleaved(buffers: &[AudioBuffer]) -> Option<Vec<f32>> {
    if buffers.is_empty() {
        return None;
    }
    if buffers.len() >= 2 {
        let left = audio_f32(&buffers[0])?;
        let right = audio_f32(&buffers[1])?;
        let n = left.len().min(right.len());
        let mut out = Vec::with_capacity(n * 2);
        for i in 0..n {
            out.push(left[i]);
            out.push(right[i]);
        }
        return Some(out);
    }
    let first = &buffers[0];
    let samples = audio_f32(first)?;
    if first.mNumberChannels <= 1 {
        let mut out = Vec::with_capacity(samples.len() * 2);
        for s in samples {
            out.push(s);
            out.push(s);
        }
        return Some(out);
    }
    Some(samples)
}

fn audio_f32(buffer: &AudioBuffer) -> Option<Vec<f32>> {
    let bytes = buffer.mDataByteSize as usize;
    let ptr = buffer.mData;
    if ptr.is_null() {
        return None;
    }
    let slice = unsafe { std::slice::from_raw_parts(ptr as *const u8, bytes) };
    Some(
        slice
            .chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect(),
    )
}
