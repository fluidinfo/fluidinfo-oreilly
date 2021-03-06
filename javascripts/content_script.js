// getting the book information from the page

var book_title  = $("#title").text();
var authors_count = $(".product-metadata .authorname").size();

var images_url = chrome.extension.getURL('images/');
var icon_url = images_url + 'icons/icon.png';

if(authors_count > 1){
  authors = [];
  $(".product-metadata .authorname").each(function(index){
    authors[index] = $(this).html();
  });
  var pageURL = createAboutForBookWithMultipleAuthors(book_title, authors);
}else{
  var book_author = $(".product-metadata .authorname").html();
  var pageURL = createAboutForBook(book_title, book_author);
}

function actOnBook(action){
  $("#ajax-loader").show();
  chrome.extension.sendRequest(
    {
      'id'  : $("#object_id").html(),
      'action'      : action+'Book'
    },
    function(resp){
      $("#ajax-loader").hide();
      $("#own-radio").removeAttr("checked");
      $("#release-radio").removeAttr("checked");
      $("#"+action+"-radio").attr("checked", "checked");
    });

};

// template for the popup (using mustache https://github.com/janl/mustache.js/ )
var popup_templ = ''
+'{{#amazon_url}}<p><a id="amazon_url" href="{{amazon_url}}">Amazon.com</a> (<span id="amazon_price">${{amazon_price}}</span>)</p>{{/amazon_url}}'
+'{{#google_url}}<p><a id="google_url" href="{{google_url}}">books.google.com</a></p>{{/google_url}}'
+'{{#goodreads_url}}<p><a id="goodreads_url" href="{{goodreads_url}}">goodreads.com</a></p>{{/goodreads_url}}'
+'<br/>'
+'<div id="radio">'
+'  <input type="radio" id="own-radio"     name="radio" {{#owns}}checked="checked"{{/owns}} /><label for="own-radio">I own this book.</label>'
+'  <input type="radio" id="release-radio" name="radio" {{^owns}}checked="checked"{{/owns}} /><label for="release-radio">I don\'t own this book</label>'
+'</div>'
+'<br/>'
+'<center><div id="ajax-loader" style="display:none;"><img src="' + images_url + 'ajax-loader.gif' + '" /></div></center>';


// inserting the fluidinfo-button in the page
$(".product-metadata .authorname").parents("dl").after('<div id="fluidinfo"><div id="popup" style="display:none; text-align:left;"></div><div id="object_id" style="display:none;"></div><img class="fluidinfo-button" src="' + icon_url + '" alt=""/></div>');

// fills the template with the variables from the response from
// fluidinfo
// and set the dialog up

function setupTooltip(response){
  vars = {title: book_title,
          owns: response.owns};
  if(response.values["amazon.com/url"]){
    vars.amazon_url = response.values["amazon.com/url"].value;
  }
  if(response.values["books.google.com/url"]){
    vars.google_url = response.values["books.google.com/url"].value;
  }
  if(response.values["goodreads.com/url"]){
    vars.goodreads_url = response.values["goodreads.com/url"].value;
  }
  if(response.values["amazon.com/price/usd"]){
    vars.amazon_price = response.values["amazon.com/price/usd"].value/100;
  }

  $("#popup").html($.mustache(popup_templ, vars));
  $("#popup button").button();
  $("#popup #radio").buttonset()
                                         
  $("#popup").dialog({ autoOpen: false, title: '<b>More information about <span id="book_title">\''+book_title+'\'</span>:</b>' });
};

// creates the tag namespace for the user if it doesn't exists
chrome.extension.sendRequest(
  {
    'action'      : 'initTag',
    'tag'         : 'owns',
    'description' : 'I own a copy of what I have tagged'
  },
  function(resp){
  });

// checks that the book has an object in Fluidinfo and retrieves some
// values
chrome.extension.sendRequest(
  {
    'action' : 'searchBook',
    'about'  : pageURL
  },
  function(resp){
    if(resp.found){
      // Book object found

      $("#object_id").html(resp.id); // saves the object-id in the DOM

      chrome.extension.sendRequest( // does the user own the book?
        {
          'action' : 'isBookOwned?',
          'id'  : resp.id
        },
        function(respTwo){
          if(respTwo.owns){
            resp.owns = true;
          }
          setupTooltip(resp);
          $(".fluidinfo-button").click(function(){ //binding dialog creation to the button click event
            var target = $(this);
            $("#popup").dialog('open').dialog('widget').position({
               my: 'left center',
               at: 'right center',
               of: target,
               collision: "fit none"
            });
          });
          $("#own-radio").click(function(){
            // mark the book as owned
            actOnBook("own");
          });

          $("#release-radio").click(function(){
            // mark the book as owned no more (removing the tag)
            actOnBook("release");
          });
        });
    }else{
      // Book object not found
      $(".fluidinfo-button").hide();
    }
  });
