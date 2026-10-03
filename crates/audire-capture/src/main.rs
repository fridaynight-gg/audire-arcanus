use std::env;
use std::io::{self, Write};
use std::thread;
use std::time::Duration;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("audire-capture [--help] [--fixture sine]");
        println!("stdin: JSON commands  stdout: framed s16le PCM 48k stereo");
        return;
    }

    if args.iter().any(|a| a == "--fixture") {
        emit_sine();
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

fn emit_sine() {
    let sample_rate = 48_000u32;
    let channels = 2usize;
    let frame_samples = (sample_rate / 50) as usize; // 20ms
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
        let len = (pcm.len() as u32).to_le_bytes();
        if out.write_all(&len).is_err() || out.write_all(&pcm).is_err() {
            break;
        }
        let _ = out.flush();
        thread::sleep(Duration::from_millis(20));
    }
}
