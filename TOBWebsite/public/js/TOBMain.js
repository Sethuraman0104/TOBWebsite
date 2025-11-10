(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner(0);


    // Fixed Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('shadow-sm').css('top', '-200px');
        }
    });
    
    
   // Back to top button
   $(window).scroll(function () {
    if ($(this).scrollTop() > 300) {
        $('.back-to-top').fadeIn('slow');
    } else {
        $('.back-to-top').fadeOut('slow');
    }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Latest-news-carousel
    $(".latest-news-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 2000,
        center: false,
        dots: true,
        loop: true,
        margin: 25,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsiveClass: true,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            },
            1200:{
                items:4
            }
        }
    });


    // What's New carousel
    $(".whats-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 2000,
        center: false,
        dots: true,
        loop: true,
        margin: 25,
        nav : true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsiveClass: true,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:2
            },
            1200:{
                items:2
            }
        }
    });



    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });



})(jQuery);


// DOM containers
const trendsContainer = document.getElementById('trendsContainer');
const newsContainer = document.getElementById('newsContainer');

// Format date
function formatDateTime(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

// Load trending list in compact scrolling format
async function loadTrends() {
  const trendsContainer = document.getElementById('trendsContainer');

  try {
    const res = await fetch('/api/trends');
    const data = await res.json();
    const trends = data.success ? data.data : [];

    if (!trends.length) {
      trendsContainer.innerHTML = '<p class="text-muted ps-2">No trends found.</p>';
      return;
    }

    // Build scrolling note-style trends
    trendsContainer.innerHTML = trends.map(t => `
      <div class="trend-note">
        <img src="${t.ImageURL || 'img/default-trend.jpg'}"
             alt="${t.TrendTitle_EN || 'Trend'}">
        <a href="${t.TrendLink || '#'}">
          <p>${t.TrendTitle_EN || 'Untitled trend'}</p>
        </a>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    trendsContainer.innerHTML = `<p class="text-danger ps-2">Error loading trends: ${err.message}</p>`;
  }
}
// Initialize
loadTrends();


function updateDateTime() {
    const now = new Date();
    
    // Options for formatting the date
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', options);

    // Options for formatting time (optional)
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

    document.getElementById('currentDateTime').textContent = `${formattedDate}`; //${formattedTime}
  }

  // Update every second
  setInterval(updateDateTime, 1000);
  updateDateTime(); // Initial call

