(function() {
    'use strict';

    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(unsafeWindow.window.document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    };

    function BetCrawler(){
        var self = this;
        this.id = 'championsbet';
        this.name = 'Champions Bet';
        this.ablyKey = '1WanEw.nso3Pg:PSRclZWpBMfJOVAn'; // Production
        this.ablyKey = '1WanEw.2_quEA:SeRdHuyTS7B0UR4Y'; // Local Dev
		this.ablyKey = window.ablyKey;
		
        this.domain = 'https://sports1.championsbet.net';
        this.token = getCookie('XSRF-TOKEN');

        this.requestHeaders = {
            Accept:'application/json, text/plain, */*',
            'X-XSRF-TOKEN':this.token
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
            this.request('/main.ashx',{
                headers:this.requestHeaders,
                query:{
                    action:'sportsmenu',
                    lang:'English'
                },
                onComplete:function(result){
                    var sportsData = JSON.parse(result);
                    self.sportsIndex = {};

                    var count = sportsData.Sports.length;
                    var list = [];
                    for(var i=0;i<count;i++){
                        var value = sportsData.Sports[i];
                        var id = value.ID;
                        var name = value.Value;
                        var label = name;
                        switch(name){

                        }
                        list.push({
                            id:id,
                            name:name,
                            label:label
                        });
                        self.sportsIndex[id] = sportsData.Sports[i];
                    }
                    onLoad(list);
                }
            });
        };

        this.loadLeagues = function(sportId,onLoad){
            var list = [];
            self.sportsIndex[sportId].Categories.forEach(function(category){
                category.Tournaments.forEach(function(tournament){
                    list.push({
                        id:tournament.ID,
                        name:tournament.Value,
                        group:category.Value
                    });
                });
            });
            onLoad(list);
        };

        this.loadEvents = function(leagueId,onLoad){
            this.request('/main.ashx',{
                headers:this.requestHeaders,
                query:{
                    action:'events',
                    TournamentIDs:leagueId,
                    Page:1,
                    PageSize:30,
                    lang:'English'
                },
                onComplete:function(raw){
                    var result = JSON.parse(raw);
                    self.$marketReferences = result.MarketsMenu;
                    console.log(self.$marketReferences);
                    var list = [];
                    result.Items.forEach(function(item){
                        var sportEvent = {
                            id:item.ID,
                            home:item.HomeText,
                            away:item.AwayText,
                            sum:item.MarketsSum,
                            sport:item.SportText,
                            group:item.CategoryText,
                            schedule:item.Date.Text+' '+item.Time,
                            markets:[]
                        };
                        item.Markets.forEach(function(market){
                            if (market.SpecialBetValue!=null && sportEvent.special==null) {
                                sportEvent.special = market.SpecialBetValue;
                            }
                            var field = market.Name.toLowerCase();
                            switch(field){
                                case 'yes':
                                    field = 'gg';
                                    break;
                                case 'no':
                                    field = 'ng';
                                    break;
                            }
                            sportEvent['market_'+field] = market.Value;
                            //sportEvent.markets.push(market);
                        });
                        list.push(sportEvent);
                    });
                    onLoad(list);
                }
            });
        };

        this.getOddTypeData = function(oddType){
            for(var marketGroup in self.$marketReferences){
                var marketItems = self.$marketReferences[marketGroup];
                var count = marketItems.length;
                for(var i=0;i<count;i++){
                    var marketItem = marketItems[i];
                    if (marketItem.OddsType==oddType){
                        marketItem.group = marketGroup;
                        return marketItem;
                    }
                }
            }
        };

        this.loadMarkets = function(eventId,onLoad){
             this.request('/main.ashx',{
                headers:this.requestHeaders,
                query:{
                    action:'event',
                    id:eventId,
                    lang:'English'
                },
                onComplete:function(raw){
                    var result = JSON.parse(raw);
                    var list = [];
                    result.MarketsFull.forEach(function(item){
                        var oddType = self.getOddTypeData(item.Type);
                        var oddData = oddType!=null?oddType:{};
                        console.log(item.Name,item.Type,oddType);
                        //
                        var eventMarket = {
                            name:item.Name,
                            type:oddData.Title,
                            typeText:oddData.Title,
                            group:oddData.group,
                            items:[]
                        };
                        console.log(item.Name,item.Type,oddData.Title,oddData.group);
                        item.Points.forEach(function(point){
                            var name = point.Name;
                            if (point.SpecialBetValue!=null) {
                                name += ' '+point.SpecialBetValue;
                            }
                            eventMarket.items.push({
                                name:name,
                                value:point.Value
                            });
                        });
                        list.push(eventMarket);
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
    }
    
    window.BetCrawler = BetCrawler;
})();