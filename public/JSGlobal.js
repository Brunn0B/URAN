// Ativar link atual no menu mobile
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    
    mobileLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Suavizar transições entre páginas
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;
            
            // Adicionar efeito de loading
            document.body.style.opacity = '0.7';
            document.body.style.transition = 'opacity 0.3s';
            
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 300);
        });
    });
});