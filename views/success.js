// $(function() {
// $.get('/getData', function(datum) {
let init = "INIT";
const retry = () =>
  fetch("/getData")
    .then(function(response) {
      console.log("RESPONSEs", response);
      // console.log( response.json());
      return response.json();
    })
    .then(function(datum) {
      console.log(datum);
      init += "<br>init";
      document.querySelector("#deets").innerHTML =
        "<span> " +
        init +
        "Oh, hi there" +
        datum +
        "! I have that data for you: " +
        "</span>";
      // $('<div></div>').text(datum[1][1]).appendTo('p#deets');
      // $('p#deets').append('<br /><img src="//chart.googleapis.com/chart?cht=lc&chtt=Data&chs=250x150&chd=t:'+datum[1][1]+'&chxt=x,y&chxs=0,c0c0c0,10,0,lt|1,c0c0c0,10,1,lt&chco=000000" />');
    });
retry();
// });
// })
