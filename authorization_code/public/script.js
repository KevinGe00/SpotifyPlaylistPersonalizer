jQuery('#modalbutton').on('click', function() {
    var uri = $("#exampleFormControlInput1").val();
    $.ajax({
        url: 'http://localhost:8888/textboxuri',
        dataType: 'text',
        type: 'post',
        data: uri,
        success: function(){
            window.alert("success")
        },
        error: function(){
            console.log("fail")
        }
    });

    setTimeout(function(){  $.get( "http://localhost:8888/generateplaylist", function( data ) {
        $(".modal-title").text("Playlist Selected: "+ data[1]);
        var imagesrc = data[2];
        $('.modal-body').prepend($('<img>',{src:imagesrc}))
      });}, 200);
   
});

