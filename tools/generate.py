"""One-time asset authorship. Build never runs this script."""
import json, subprocess, pathlib
root=pathlib.Path(__file__).resolve().parent.parent

def run(*args): subprocess.run(list(map(str,args)),check=True,stdout=subprocess.DEVNULL)
def rect(x,y,w,h,c): return dict(op='fill_rect',x=x,y=y,width=w,height=h,color=c)
def sprite(name,ops,head=False):
 p=root/'assets/snake'/name;p.parent.mkdir(parents=True,exist_ok=True)
 log=p.with_suffix('.json');log.write_text(json.dumps(ops))
 run('draw-sheet' if head else 'draw','render','--actions',log,'--out',p,'--width',32,'--height',32,'--no-layers')
dark='#103e3fff';edge='#208b79ff';green='#58dbadff';light='#bcffdaff'
body=[rect(0,7,32,18,dark),rect(0,9,32,14,edge),rect(0,11,32,10,green),rect(0,11,32,2,light)]
for x in [3,13,23]:body += [rect(x,14,5,2,edge),rect(x+2,18,5,2,edge)]
sprite('body.png',body)
corner=[rect(7,7,25,18,dark),rect(7,7,18,25,dark),rect(9,9,23,14,edge),rect(9,9,14,23,edge),rect(11,11,21,10,green),rect(11,11,10,21,green),rect(11,11,21,2,light),rect(11,11,2,21,light),rect(16,16,4,4,edge),rect(16,25,3,4,edge),rect(26,16,4,3,edge)]
sprite('corner.png',corner)
sprite('tail.png',[rect(3,14,7,4,dark),rect(8,11,8,10,dark),rect(15,7,17,18,dark),rect(10,13,8,6,edge),rect(17,9,15,14,edge),rect(18,11,14,10,green),rect(18,11,14,2,light),rect(24,16,5,2,edge)])
for frame,gap in enumerate([0,3,7,3]):
 ops=[rect(0,7,20,18,dark),rect(6,4,17,24,dark),rect(23,7,5,18,dark),rect(28,10,3,12,dark),rect(0,9,22,14,green),rect(7,6,15,20,green),rect(22,9,5,14,green),rect(27,11,2,10,green),rect(7,6,14,3,light),rect(5,11,6,2,light),rect(18,7,6,6,dark),rect(20,8,3,3,'#ffffffff'),rect(22,9,1,2,'#faad55ff')]
 if gap:ops += [rect(20,16-gap//2,12,gap,'#07151eff'),rect(24,15-gap//2,4,2,light),rect(24,16+gap//2,4,2,light)]
 else:ops += [rect(24,16,6,2,dark)]
 sprite(f'head/{frame}.png',ops,True)
for name,dur,freq,wave,gain in [('eat',65,740,'triangle',-16),('combo-up',180,1100,'sine',-19),('death',620,110,'saw',-20)]:
 cfg=root/f'assets/audio/{name}.config.json'
 cfg.write_text(json.dumps(dict(sample_rate=44100,channels='stereo',max_duration_ms=dur+100,seed=42,actions=str(root/f'assets/audio/{name}.ops.json'),preview=str(root/f'assets/audio/{name}.png'),wav=str(root/f'assets/audio/{name}.wav'))))
 run('sfx-synth','--config',cfg,'init');run('sfx-synth','--config',cfg,'add-voice','--name','tone','--wave',wave,'--freq',freq,'--dur',dur,'--gain',gain)
 run('sfx-synth','--config',cfg,'set-pitch','--voice','tone','--slide-to',freq* (0.25 if name=='death' else 1.5),'--over',dur)
 run('sfx-synth','--config',cfg,'render')
cfg=root/'assets/audio/music.config.json'
cfg.write_text(json.dumps(dict(sample_rate=44100,channels='stereo',max_duration_ms=8000,seed=42,actions=str(root/'assets/audio/music.ops.json'),preview=str(root/'assets/audio/music.png'),wav=str(root/'assets/audio/music.wav'),mid=str(root/'assets/audio/music.mid'))))
run('music','--config',cfg,'init');run('music','--config',cfg,'set-tempo','--bpm',120)
for name,wave,gain in [('bass','sine',-23),('arp','triangle',-30)]:
 run('music','--config',cfg,'define-track','--name',name,'--instrument',wave)
 run('music','--config',cfg,'set-track-fx','--track',name,'--gain',gain)
for beat in range(16):
 run('music','--config',cfg,'add-note','--track','bass','--pitch',[45,45,41,43][beat//4],'--t',beat,'--dur',0.7,'--velocity',70)
 for j in range(2):run('music','--config',cfg,'add-note','--track','arp','--pitch',[69,72,76,72,65,69,72,69][(beat*2+j)%8],'--t',beat+j/2,'--dur',0.3,'--velocity',50)
run('music','--config',cfg,'render')
