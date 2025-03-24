$(document).ready(function () {
    if (window.location.pathname.includes("index.html")) {
        
        function updateTextColors() {
            $(".wsmainfull a, .wsmainfull span, .wsmainfull i, .wsmainfull nav a").each(function () {
                var elementOffset = $(this).offset().left; // Get element's left position
                var headerWidth = $("header").width();

                if (elementOffset < headerWidth / 2) {
                    // If the element is in the black section (left side), set text color to white
                    $(this).css("color", "white");
                } else {
                    // If the element is in the yellow section (right side), set text color to black
                    $(this).css("color", "black");
                }
            });
        }

        // Run once on page load to apply correct colors
        updateTextColors();

        $(window).on("scroll", function () {
            var scrollTop = $(window).scrollTop();

            if (scrollTop > 80) {		
                $(".wsmainfull").addClass("scroll");
                $("header").css({
                    "background": "black",
                    "color": "white"
                });

                // Change all text color to white when scrolled down
                $(".wsmainfull a, .wsmainfull span, .wsmainfull i, .wsmainfull nav a").css("color", "white");

            } else {
                $(".wsmainfull").removeClass("scroll");
                $("header").css({
                    "background": "linear-gradient(to right, black 50%, #FFCD00 50%)"
                });

                // Update text colors when scrolling back up
                updateTextColors();
            }
        });

    }
});
