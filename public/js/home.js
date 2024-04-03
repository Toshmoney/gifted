document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.querySelector('.toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.overlay');
  
    toggleButton.addEventListener('click', function () {
      mobileNav.classList.toggle('active');
      overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
    });
  
    overlay.addEventListener('click', function () {
      mobileNav.classList.remove('active');
      overlay.style.display = 'none';
    });
  });
  
  
  const faqs = document.querySelectorAll(".faq")
  
    faqs.forEach((faq) =>{
      faq.addEventListener("click", () => {
        faq.classList.toggle("active")
      })
    })