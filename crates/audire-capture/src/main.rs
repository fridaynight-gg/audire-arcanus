use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::env;
use std::io::{self, Write};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "macos")]
mod sck;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("audire-capture [--help] [--list] [--fixture sine] [--mic ID] [--app PID]");
        println!("stdin: JSON commands  stdout: framed s16le PCM 48k stereo");
        return;
    }

    if args.iter().any(|a| a == "--list") {
        list_sources();
        return;
    }

    if args.iter().any(|a| a == "--fixture") {
        emit_sine();
        return;
    }

    if let Some(idx) = args.iter().position(|a| a == "--mic") {
        let id = args.get(idx + 1).map(String::as_str).unwrap_or("default");
        if let Err(err) = capture_mic(id) {
            eprintln!(
                r#"{{"event":"error","tag":"PermissionDenied","message":"{}"}}"#,
                err.replace('"', "'")
            );
            std::process::exit(1);
        }
        return;
    }

    if let Some(idx) = args.iter().position(|a| a == "--app") {
        let pid = args.get(idx + 1).map(String::as_str).unwrap_or("");
        if let Err(err) = capture_app(pid) {
            eprintln!(
                r#"{{"event":"error","tag":"PermissionDenied","message":"{}"}}"#,
                err.replace('"', "'")
            );
            std::process::exit(1);
        }
        return;
    }

    eprintln!(r#"{{"event":"ready"}}"#);
    let mut line = String::new();
    if io::stdin().read_line(&mut line).ok().is_none() {
        return;
    }
    if line.contains("fixture") || line.contains("sine") {
        emit_sine();
    }
}

fn json_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn list_sources() {
    let mut out = String::from("[{\"_tag\":\"fixture\",\"name\":\"sine\"}");
    if let Ok(host) = std::panic::catch_unwind(cpal::default_host) {
        if let Ok(devices) = host.input_devices() {
            for (i, device) in devices.enumerate() {
                let name = device.name().unwrap_or_else(|_| "mic".into());
                let escaped = json_escape(&name);
                out.push_str(&format!(
                    ",{{\"_tag\":\"mic\",\"id\":\"{i}\",\"name\":\"{escaped}\"}}"
                ));
            }
        }
    }
    append_apps(&mut out);
    out.push(']');
    println!("{out}");
}

#[cfg(target_os = "macos")]
fn append_apps(out: &mut String) {
    use objc2_app_kit::{NSApplicationActivationPolicy, NSWorkspace};

    let workspace = NSWorkspace::sharedWorkspace();
    let apps = workspace.runningApplications();
    let self_pid = std::process::id() as i32;
    for app in apps.iter() {
        if app.processIdentifier() == self_pid {
            continue;
        }
        if app.activationPolicy() != NSApplicationActivationPolicy::Regular {
            continue;
        }
        let name = app
            .localizedName()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "app".into());
        if name.is_empty() {
            continue;
        }
        let pid = app.processIdentifier();
        let bundle = app
            .bundleIdentifier()
            .map(|s| s.to_string())
            .unwrap_or_default();
        let escaped = json_escape(&name);
        let bundle_esc = json_escape(&bundle);
        if bundle.is_empty() {
            out.push_str(&format!(
                r#",{{"_tag":"app","pid":{pid},"name":"{escaped}"}}"#
            ));
        } else {
            out.push_str(&format!(
                r#",{{"_tag":"app","pid":{pid},"name":"{escaped}","bundleId":"{bundle_esc}"}}"#
            ));
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn append_apps(_out: &mut String) {}

fn emit_sine() {
    let sample_rate = 48_000u32;
    let channels = 2usize;
    let frame_samples = (sample_rate / 50) as usize;
    let mut n = 0u64;
    let stdout = io::stdout();
    let mut out = stdout.lock();
    loop {
        let mut pcm = vec![0u8; frame_samples * channels * 2];
        for i in 0..frame_samples {
            let t = n as f64 / sample_rate as f64;
            n += 1;
            let s = (2.0 * std::f64::consts::PI * 440.0 * t).sin();
            let v = (s * 8000.0) as i16;
            let bytes = v.to_le_bytes();
            let base = i * channels * 2;
            pcm[base] = bytes[0];
            pcm[base + 1] = bytes[1];
            pcm[base + 2] = bytes[0];
            pcm[base + 3] = bytes[1];
        }
        if write_frame(&mut out, &pcm).is_err() {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }
}

pub(crate) fn write_frame(out: &mut impl Write, pcm: &[u8]) -> io::Result<()> {
    let len = (pcm.len() as u32).to_le_bytes();
    out.write_all(&len)?;
    out.write_all(pcm)?;
    out.flush()
}

fn capture_mic(id: &str) -> Result<(), String> {
    let host = cpal::default_host();
    let device = if id == "default" {
        host.default_input_device()
            .ok_or_else(|| "no default input".to_string())?
    } else {
        let index: usize = id.parse().map_err(|_| "bad mic id".to_string())?;
        host.input_devices()
            .map_err(|e| e.to_string())?
            .nth(index)
            .ok_or_else(|| "mic not found".to_string())?
    };

    let config = device.default_input_config().map_err(|e| e.to_string())?;
    let sample_rate = config.sample_rate().0;
    let channels = config.channels() as usize;
    let (tx, rx) = mpsc::sync_channel::<Vec<f32>>(16);

    let stream = device
        .build_input_stream(
            &config.into(),
            move |data: &[f32], _| {
                let _ = tx.send(data.to_vec());
            },
            |err| {
                eprintln!(r#"{{"event":"error","tag":"CaptureUnavailable","message":"{err}"}}"#);
            },
            None,
        )
        .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    write_pcm_loop(rx, sample_rate, channels)
}

fn to_48k_stereo_s16(input: &[f32], rate: u32, channels: usize, out_frames: usize) -> Vec<u8> {
    let mut pcm = vec![0u8; out_frames * 4];
    for i in 0..out_frames {
        let src_i = if rate == 48_000 {
            i
        } else {
            ((i as u64 * rate as u64) / 48_000) as usize
        };
        let base = src_i * channels;
        let l = *input.get(base).unwrap_or(&0.0);
        let r = if channels > 1 {
            *input.get(base + 1).unwrap_or(&l)
        } else {
            l
        };
        let ls = (l.clamp(-1.0, 1.0) * 32767.0) as i16;
        let rs = (r.clamp(-1.0, 1.0) * 32767.0) as i16;
        let lb = ls.to_le_bytes();
        let rb = rs.to_le_bytes();
        let o = i * 4;
        pcm[o] = lb[0];
        pcm[o + 1] = lb[1];
        pcm[o + 2] = rb[0];
        pcm[o + 3] = rb[1];
    }
    pcm
}

pub(crate) fn write_pcm_loop(
    rx: mpsc::Receiver<Vec<f32>>,
    sample_rate: u32,
    channels: usize,
) -> Result<(), String> {
    let frame_samples = 960usize;
    let mut acc: Vec<f32> = Vec::new();
    let stdout = io::stdout();
    let mut out = stdout.lock();
    while let Ok(chunk) = rx.recv() {
        acc.extend_from_slice(&chunk);
        let needed = frame_samples * channels.max(1);
        while acc.len() >= needed {
            let take: Vec<f32> = acc.drain(..needed).collect();
            let pcm = to_48k_stereo_s16(&take, sample_rate, channels, frame_samples);
            if write_frame(&mut out, &pcm).is_err() {
                return Ok(());
            }
        }
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn capture_app(pid: &str) -> Result<(), String> {
    sck::capture_app(pid)
}

#[cfg(not(target_os = "macos"))]
fn capture_app(_pid: &str) -> Result<(), String> {
    Err("app capture is macOS only".into())
}
