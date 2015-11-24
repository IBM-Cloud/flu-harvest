Here in Boston we're in the grip of a bitter cold spell this month with temperatures well below freezing for weeks and the warmth of the holiday season far behind us, our attention naturally turns to thoughts of...infuenza! With flu sweeping through the nation and reaching epidemic proportions in many states, you may be wondering (if you're in the US) how bad is the flu in my state? Well, the US Centers for Disease Control can help you answer that question [on their web site](http://www.cdc.gov/flu/weekly/). You can get a static [PDF](http://www.cdc.gov/flu/weekly/pdf/External_F1453.pdf) or an [XML feed](http://www.cdc.gov/flu/weekly/flureport.xml) of flu levels by state, but what's a modern web developer to do with that? Look to Cloudant, that's what.

We are now providing the CDC data as JSON. You can hit the database directly to get the latest weekly data with [this query](https://opendata.cloudant.com/flureports/_all_docs?include_docs=true&descending=true&limit=1). Or you can take advantage of this simple API we've put together:

## Flu data API
- Get the latest week's flu data with this request: [http://fluharvest.mybluemix.net/latest](http://fluharvest.mybluemix.net/latest)
- Or get the report for a single state by providing it's abbreviation in the request: [http://fluharvest.mybluemix.net/latest?state=CA](http://fluharvest.mybluemix.net/latest?state=CA)
- You can also get this data in a map-ready format by requesting the report information be attached to state geographies: [http://fluharvest.mybluemix.net/latest?geo=true](http://fluharvest.mybluemix.net/latest?geo=true)

Just to touch on the possibilities, we've created this [simple interactive flu map](http://fluharvest.mybluemix.net/map.html] that shows a thematic map of the week's flu spread throughout the US. It uses the API above and [LeafletJS](http://leafletjs.com). View source to see how it works. All the javascript is in the web page.

How is this useful? Well let's say you have an app for business travellers, and you'd like to give them a warning that the state they are flying into is having a bad week with the flu and they should pay special attention to people coughing in the airport and wash their hands more than usual. Hit this API and use the data in your app? This is useful for families too. Send your customers a warning when flu levels hit 'Widespread' so parents can tell their kids to be extra careful in school. Or maybe it's a good week to take a vacation?

How will you use flu reports? Will you build a map with [D3](http://d3js.org/)? Or integrate it into a customer-facing app? Let us know about it. If you have questions or problems, start a discussion on [Cloudant's section of developerWorks](https://developer.ibm.com/answers/topics/cloudant/).

Look for more open data sets and API access to them soon. Let us know what data sets would enhance your appication development efforts. From user demographics to social media sentiment, we're here to help make  Cloudant the best ecosystem for mobile app development.
