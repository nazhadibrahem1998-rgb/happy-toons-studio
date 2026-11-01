/* Public "N online now" counter from Umami's share API. Cookieless; no personal data. */
(function(){
var B='https://cloud.umami.is/analytics/eu/api',S='/share/DO3VtNMrHZH5w0yJ',t,w,els=document.querySelectorAll('[data-online-now]');
if(!els.length||!window.fetch)return;
function hide(){els.forEach(function(e){e.hidden=true})}
function show(n){n=Math.max(1,n|0);els.forEach(function(e){e.textContent='🟢 '+n+' online now';e.hidden=false})}
function share(){return fetch(B+S).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){t=d.token;w=d.websiteId;if(!t||!w)throw 0})}
function active(retry){
return fetch(B+'/websites/'+w+'/active',{headers:{'x-umami-share-token':t,'x-umami-share-context':'1'}}).then(function(r){
if(r.status==401&&retry){t=0;return share().then(function(){return active(false)})}
if(!r.ok)throw 0;return r.json().then(function(d){if(typeof d.visitors!='number')throw 0;show(d.visitors)})})}
function tick(){if(document.hidden)return;(t?Promise.resolve():share()).then(function(){return active(true)}).catch(hide)}
tick();setInterval(tick,60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)tick()});
})();
