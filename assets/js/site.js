(function(){var b=document.querySelector('.menu-btn'),n=document.getElementById('site-nav');if(!b||!n)return;
function set(o){b.setAttribute('aria-expanded',o?'true':'false');n.classList.toggle('open',o);b.setAttribute('aria-label',o?'Close menu':'Open menu')}
b.addEventListener('click',function(){set(b.getAttribute('aria-expanded')!=='true')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('open')){set(false);b.focus()}});
n.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
window.matchMedia('(min-width:1101px)').addEventListener('change',function(m){if(m.matches)set(false)});
var y=document.getElementById('y');if(y)y.textContent=new Date().getFullYear();})();
