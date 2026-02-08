// Sound Generator using Web Audio API
class SoundGenerator {
    constructor() {
        this.audioContext = null;
    }

    getContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    playBell() {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // Create multiple oscillators for a rich bell sound
        const frequencies = [800, 1000, 1200];
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            // Bell envelope - quick attack, long decay
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3 / (i + 1), now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 1.5);
        });
    }

    playCheer() {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // Create an upward sweeping sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.5);
        
        // Add some sparkle
        setTimeout(() => {
            const sparkle = ctx.createOscillator();
            const sparkleGain = ctx.createGain();
            const sparkleNow = ctx.currentTime;
            
            sparkle.frequency.value = 1200;
            sparkle.type = 'sine';
            
            sparkleGain.gain.setValueAtTime(0.2, sparkleNow);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleNow + 0.3);
            
            sparkle.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);
            
            sparkle.start(sparkleNow);
            sparkle.stop(sparkleNow + 0.3);
        }, 100);
    }

    playSuccess() {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // Three ascending notes - C, E, G
        const notes = [523.25, 659.25, 783.99];
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = now + (i * 0.15);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    playCoin() {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // Classic coin sound - two quick beeps
        const frequencies = [988, 1319];
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.value = freq;
            osc.type = 'square';
            
            const startTime = now + (i * 0.08);
            
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }

    playWhoosh() {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // White noise whoosh
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.5);
    }

    play(soundName) {
        switch(soundName) {
            case 'bell':
                this.playBell();
                break;
            case 'cheer':
                this.playCheer();
                break;
            case 'success':
                this.playSuccess();
                break;
            case 'coin':
                this.playCoin();
                break;
            case 'whoosh':
                this.playWhoosh();
                break;
            default:
                this.playBell();
        }
    }
}

// Create global sound generator instance
const soundGen = new SoundGenerator();
