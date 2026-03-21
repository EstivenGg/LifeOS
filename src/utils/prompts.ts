const P=[
'¿Qué fue lo mejor que te pasó hoy?','¿Qué aprendiste hoy?','¿Qué harías diferente?',
'¿Qué te hizo sonreír?','¿Cuál fue tu mayor desafío?','¿Qué persona impactó tu día?',
'¿Qué hábito te costó más?','¿Cuándo te sentiste más en paz?','¿Qué quieres lograr mañana?',
'Si tu día fuera película, ¿cómo se llamaría?','¿Qué progreso hiciste hoy?',
'¿Qué energía quieres llevar a mañana?','¿Cuándo fuiste más tú hoy?',
'¿Qué te sorprendió?','¿De qué decisión estás orgulloso/a?',
'¿Cómo cuidaste tu salud mental?','¿Qué idea te inspiró?',
'¿Qué podrías soltar?','¿Qué momento disfrutaste más?','¿Qué te generó calma?',
]
export function getDailyPrompt(d:string):string{let h=0;for(let i=0;i<d.length;i++){h=((h<<5)-h)+d.charCodeAt(i);h|=0};return P[Math.abs(h)%P.length]}
export function getRandomPrompt():string{return P[Math.floor(Math.random()*P.length)]}
