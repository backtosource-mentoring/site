/* ============================================================
   התנהגות משותפת לכל העמודים: תפריט מובייל, חשיפה בגלילה,
   והופעת הכפתור המרחף.
   ============================================================ */
(function(){
  requestAnimationFrame(function(){ document.body.classList.add('ready'); });

  var toggle=document.getElementById('navToggle'), links=document.getElementById('navLinks');
  toggle.dataset.open=toggle.textContent.trim();
  function close(){ links.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.textContent=toggle.dataset.open; }
  toggle.addEventListener('click',function(){
    var open=links.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent=open?toggle.dataset.close:toggle.dataset.open;
  });
  links.addEventListener('click',function(e){ if(e.target.tagName==='A') close(); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&links.classList.contains('open')){ close(); toggle.focus(); }
  });

  /* הכפתור המרחף מופיע אחרי מסך הפתיחה, ונסוג באזור ההמרה */
  var body=document.body;
  function onScroll(){ body.classList.toggle('scrolled', window.scrollY > window.innerHeight*0.45); }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  if('IntersectionObserver' in window){
    var ctaObs=new IntersectionObserver(function(es){
      body.classList.toggle('at-cta', es[0].isIntersecting);
    },{threshold:.18});
    var ctaEl=document.querySelector('#closing, #contact');
    if(ctaEl) ctaObs.observe(ctaEl);
  }

  var els=document.querySelectorAll('.enter');
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion:reduce)').matches){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('seen'); io.unobserve(en.target); } });
    },{rootMargin:'0px 0px -12% 0px',threshold:.12});
    els.forEach(function(el){ io.observe(el); });
  } else { els.forEach(function(el){ el.classList.add('seen'); }); }
})();
