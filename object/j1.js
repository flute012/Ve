
//
const audioElements = document.querySelectorAll('audio');
audioElements.forEach((audio, index) => {
  audio.addEventListener('play', () => {
    // Pause all other audio elements
    audioElements.forEach(otherAudio => {
      if (otherAudio !== audio) {
        otherAudio.pause();
      }
    });
  });

  audio.addEventListener('ended', () => {
    // Play the next audio element if it exists
    if (index < audioElements.length - 1) {
      audioElements[index + 1].play();
    }
  });
});

$(document).ready(function () {
  // 
  $(window).scroll(function () {
    if ($(window).scrollTop() > 75) {
      if ($(".back-top").hasClass("hide")) {
        $(".back-top").toggleClass("hide");
      }
    } else {
      $(".back-top").addClass("hide");
    }
  });

  // 
  $(".back-top").on("click", function (event) {
    $("html, body").animate(
      {
        scrollTop: 0
      },
      400 //
    );
  });
});
