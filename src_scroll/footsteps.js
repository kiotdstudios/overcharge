// Short, dry rooftop shoe taps. One timbre for both gaits; the animation's
// footfall frames determine cadence. No music or looping audio is created.
let audio;
let noise;
let stepNumber=0;

export function unlockFootsteps(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  audio ||= new Context();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  if(noise)return;
  noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*0.075),audio.sampleRate);
  const data=noise.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
}

export function playFootstep(){
  if(!audio||audio.state!=='running'||!noise)return;
  const now=audio.currentTime;
  const source=audio.createBufferSource();source.buffer=noise;
  const filter=audio.createBiquadFilter();filter.type='lowpass';
  filter.frequency.value=stepNumber++%2?760:920;
  const gain=audio.createGain();
  gain.gain.setValueAtTime(0.0001,now);
  gain.gain.exponentialRampToValueAtTime(0.095,now+0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001,now+0.065);
  source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
  source.start(now);source.stop(now+0.075);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
