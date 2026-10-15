// Approved travel navigation changes: one link and its content-sized mobile menu.
// Keep every other byte (including analytics, SEO, CTA attributes and CSS) gated.
export const menuHeightLine="        fitMenu();\n";
export const mobileMenuBlock="      var mobileMenu = window.matchMedia('(max-width: 720px)');\n      function fitMenu() {\n        links.style.flexWrap = mobileMenu.matches ? 'nowrap' : '';\n        links.style.maxHeight = mobileMenu.matches && links.classList.contains('is-open') ? 'none' : '';\n      }\n      mobileMenu.addEventListener('change', fitMenu);\n      fitMenu();\n";
export const withoutServicesNav=html=>html.replace(/<a href="\/services" class="cbt-nav-link" data-astro-cid-[a-z0-9]+>生活服務<\/a>/g,'').replace(mobileMenuBlock,'').replace(menuHeightLine,'');
export const serviceStyleExclusions='\n/* Services ships its own stylesheet; keep travel utility discovery stable. */\n@source not "../features/services";\n@source not "../pages/services";\n@source not "../../scripts/services";\n@source not "../../tests/services-integration.test.mjs";\n@source not "../../docs/services-integration.md";\n@source not "../../.github/workflows/services-check.yml";\n';
export function originalTravelSource(path,text){
 text=text.replace(/\r\n/g,'\n');
 if(path==='src/components/SiteNav.astro')return text.replace("  { href: '/services', label: '生活服務', key: 'services' },\n",'').replace(mobileMenuBlock,'').replace(menuHeightLine,'');
 if(path==='src/styles/global.css')return text.replace(serviceStyleExclusions,'');
 return text;
}
