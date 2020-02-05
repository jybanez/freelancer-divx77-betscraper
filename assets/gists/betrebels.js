(function() {
    'use strict';
    
    window.BetRebelQueries = {};
    
    var oldXHROpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // do something with the method, url and etc.
        var uri = new URI(url);
        //console.log(url,uri);
        //console.log(uri.path());

        window.BetRebelQueries[uri.path()] = parseQueryString(uri.query());
        switch(uri.path()){
            case '/Sportsbook/GetAllSports':
                console.log('All Sports Menu Requested...');
                //console.log(url,uri);
                //console.log('PATH',uri.path());
                //console.log('QUERY',uri.query());

                this.addEventListener('load', function() {
                    // do something with the response text
                    console.log('All Sports Menu Data...');
                    console.log(JSON.parse(this.responseText));
                });
                break;
            case '/SportsBook/GetMenuBySport':
                var params = uri.search(true);
                console.log('Specific Sport Menu Requested...');
                console.log('Sport ID Requested : '+params.sportId);
                this.addEventListener('load', function() {
                    // do something with the response text
                    console.log('Specific Sport Menu Data...');
                    console.log(JSON.parse(this.responseText));
                });
                break;
        }

        return oldXHROpen.apply(this, arguments);
    };
    
    function typeOf(item){
        if (item == null) return 'null';
        if (item.$family != null) return item.$family();

        if (item.nodeName){
            if (item.nodeType == 1) return 'element';
            if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
        } else if (typeof item.length == 'number'){
            if ('callee' in item) return 'arguments';
            if ('item' in item) return 'collection';
        }

        return typeof item;
    };

    function $defined(value){
        return value != null;
    };

    function $type(object){
        var type = typeOf(object);
        if (type == 'elements') return 'array';
        return (type == 'null') ? false : type;
    };

    function parseQueryString(str, decodeKeys, decodeValues){
		if (decodeKeys == null) decodeKeys = true;
        if (decodeValues == null) decodeValues = true;

        var vars = str.split(/[&;]/),
            object = {};
        if (!vars.length) return object;

        vars.forEach(function(val){
            var index = val.indexOf('=') + 1,
                value = index ? val.substr(index) : '',
                keys = index ? val.substr(0, index - 1).match(/([^\]\[]+|(\B)(?=\]))/g) : [val],
                obj = object;
            if (!keys) return;
            if (decodeValues) value = decodeURIComponent(value);
            keys = keys.filter(function(item,index){ return item.length>0;});
            keys.forEach(function(key, i){
                if (decodeKeys) key = decodeURIComponent(key);
                var current = obj[key];

                if (i < keys.length - 1) obj = obj[key] = current || {};
                else if ($type(current) == 'array') current.push(value);
                else obj[key] = current != null ? [current, value] : value;
            });
        });

        return object;
	}

    function BetCrawler(){
        var self = this;
        this.id = 'betrebels';
        this.name = 'Bet Rebels';
        this.ablyKey = '1WanEw.nso3Pg:PSRclZWpBMfJOVAn'; // Production
        this.ablyKey = '1WanEw.2_quEA:SeRdHuyTS7B0UR4Y'; // Local Dev

        this.domain = 'https://sb1capi-altenar.biahosted.com';

        this.requestQueries = {};
        this.requestHeaders = {
            Accept:'*/*'
        };

        this.getRequestQuery = function(path){
            console.log(window.BetRebelQueries);
            return window.BetRebelQueries[path];
        };

        this.request = function(path,options){
            var method = options.method || 'GET';
            var headers = options.headers;
            var query = options.query;
            var onComplete = options.onComplete || function(){};

            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    onComplete(this.responseText);
                }
            };

            var url = this.domain+path;
            if (query!=null){
                var parts = [];
                for(var key in query){
                    parts.push(key+'='+query[key]);
                }
                url+='?'+parts.join('&');
            }

            xhttp.open(method, url, true);
            if (headers!=null) {
                for(var key in headers){
                    xhttp.setRequestHeader(key,headers[key]);
                }
            }
            xhttp.send();
        };

        this.loadSports = function(onLoad){
            var path = '/Sportsbook/GetAllSports';
            this.request(path,{
                headers:this.requestHeaders,
                query:this.getRequestQuery(path),
                onComplete:function(result){
                    var sportsData = JSON.parse(result);
                    var count = sportsData.Result.length;
                    var list = [];
                    for(var i=0;i<count;i++){
                        var value = sportsData.Result[i];
                        var name = value.Name;
                        var label = value.Name;
                        switch(name){
                            case 'Football':
                                name = 'Soccer';
                                label = 'Soccer (Football)';
                                break;
                        }
                        list.push({
                            id:value.Id,
                            name:name,
                            label:label
                        });
                    }
                    onLoad(list);
                }
            });
        };

        this.loadLeagues = function(sportId,onLoad){
            var path = '/SportsBook/GetMenuBySport';
            var query = this.getRequestQuery('/Sportsbook/GetAllSports');
            query.sportId = sportId;
            this.request(path,{
                headers:this.requestHeaders,
                query:query,
                onComplete:function(result){
                    var leagueData = JSON.parse(result);
                    var count = leagueData.Result.length;
                    var list = [];
                    leagueData.Result.forEach(function(result){
                        result.Items.forEach(function(group){
                            group.Items.forEach(function(item){
                                list.push({
                                    id:item.Id,
                                    group:group.Name,
                                    name:item.Name
                                });
                            });
                        });
                    });
                    onLoad(list);
                }
            });
        };

        this.loadEvents = function(leagueId,onLoad){
            var path = '/Sportsbook/GetEvents';
            var query = this.getRequestQuery('/Sportsbook/GetAllSports');
            query.categoryids = 0;
            query.sportIds = 0;
            query.champids = leagueId;
            this.request(path,{
                headers:this.requestHeaders,
                query:query,
                onComplete:function(raw){
                    var result = JSON.parse(raw);
                    var list = [];
                    result.Result.Items.forEach(function(sport){
                        sport.Items.forEach(function(leagues){
                            leagues.Items.forEach(function(items){
                                items.Events.forEach(function(item){
                                    var sportEvent = {
                                        id:item.Id,
                                        home:item.Competitors[0].Name,
                                        away:item.Competitors[1].Name,
                                        //sum:item.MarketsSum,
                                        sport:item.SportName,
                                        group:item.CategoryName,
                                        schedule:item.EventDate,
                                        markets:[]
                                    };
                                    item.Items.forEach(function(market){
                                        switch(market.Name) {
                                            case '1x2':
                                            case 'GG/NG':
                                                market.Items.forEach(function(marketItem){
                                                    var field = marketItem.Name.toLowerCase();
                                                    switch(field){

                                                    }
                                                    sportEvent['market_'+field]=marketItem.Price;
                                                });
                                                break;
                                            case 'Total':
                                                if (!$defined(sportEvent.special)) {
                                                    sportEvent.special=market.SpecialOddsValue;
                                                }
                                                market.Items.forEach(function(marketItem){
                                                    var fieldName = marketItem.Name.toLowerCase();
                                                    var fieldParts = fieldName.split(' ');
                                                    var field = fieldParts[0];
                                                    switch(field){
                                                        case 'over':
                                                            break;
                                                        case 'under':
                                                            break;
                                                    }
                                                    sportEvent['market_'+field]=marketItem.Price;
                                                });
                                                break;
                                        }
                                    });
                                    list.push(sportEvent);
                                });
                            });
                        });
                    });
                    console.log(list);
                    onLoad(list);
                }
            });
        };

        this.loadMarkets = function(eventId,onLoad){
            var path = '/Sportsbook/GetEventDetails';
            var query = this.getRequestQuery('/Sportsbook/GetAllSports');
            query.eventId = eventId;
            this.request(path,{
                headers:this.requestHeaders,
                query:query,
                onComplete:function(result){
                    var marketsData = JSON.parse(result);
                    var list = [];
                    marketsData.Result.MarketGroups.forEach(function(group){
                        group.Items.forEach(function(item){
                            var eventMarket = {
                                name:item.Name,
                                type:item.Name,
                                typeText:item.Name,
                                group:group.Name,
                                items:[]
                            };
                            console.log(item.Name,item.Type,group.Name);
                            item.Items.forEach(function(price){
                                eventMarket.items.push({
                                    name:price.Name,
                                    value:price.Price
                                });
                            });
                            list.push(eventMarket);
                        });
                    });
                    onLoad(list);
                }
            });

        };

        var head = unsafeWindow.window.document.getElementsByTagName('head')[0];
        var script = unsafeWindow.window.document.createElement('script');
        script.type = 'text/javascript';
        script.onload = function() {
            console.log('Ably Messaging Loaded');
            var ably = new Ably.Realtime({key:self.ablyKey});
            self.channel = ably.channels.get(self.id);
            self.channel.publish('hello','Hello from '+self.name+'!');
            self.channel.subscribe('hi',function(message){
                if (message.data==self.id) {
                    self.channel.publish('hello','Hello from '+self.name+'!');
                }
            });
            self.channel.subscribe('load',function(message){
                //console.log('Message Received',message);
                var params = JSON.parse(LZString.decompressFromUTF16(message.data));
                //console.log(params);
                var func = 'load'+params.command;
                var args = params.arguments==null?[]:params.arguments;
                args.push(function(result){
                    var response = params;
                    response.result = result;
                    //console.log(response);
                    self.channel.publish('response',LZString.compressToUTF16(JSON.stringify(response)));
                });
                //console.log(func,args);
                self[func].apply(self,args);
            });
        };
        script.src = 'https://cdn.ably.io/lib/ably.min-1.js';
        head.appendChild(script);
    };
    
	
	window.BetCrawler = BetCrawler;
})();