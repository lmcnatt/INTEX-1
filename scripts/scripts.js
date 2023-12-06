
//Animation Observer
const hiddenElements = document.querySelectorAll('.hidden');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        entry.target.classList.toggle('show', entry.isIntersecting);
        if (entry.isIntersecting){
            observer.unobserve(entry.target)
        }
    });
},
{
    threshold: 0.9,
    rootMargin: "-100px"
});

hiddenElements.forEach((el) => observer.observe(el));