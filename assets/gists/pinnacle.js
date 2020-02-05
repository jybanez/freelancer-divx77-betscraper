(function() {
    'use strict';
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

    function priceToMoneyline(price){
        var moneyline = price;
        var decimal = 0;
        if (moneyline >= 0) {
            decimal = (moneyline / 100.0) + 1;
        } else {
            decimal = (100 / -moneyline) + 1;
        }
        return decimal.toFixed(3);
    }

    function BetCrawler(){
        var self = this;
        this.id = 'pinnacle';
        this.name = 'Pinnacle';

        this.ablyKey = '1WanEw.nso3Pg:PSRclZWpBMfJOVAn'; // Production
        this.ablyKey = '1WanEw.2_quEA:SeRdHuyTS7B0UR4Y'; // Local Dev

        this.domain = 'https://guest.api.arcadia.pinnacle.com';
        this.apiKey = 'CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R';

        this.requestHeaders = {
            Accept:'application/json',
            'X-APi-KEY':this.apiKey
        };

        this.request = function(path,options){
            var method = options.method || 'GET';
            var headers = options.headers || {};
            var onComplete = options.onComplete || function(){};

            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    onComplete(this.responseText);
                }
            };
            xhttp.open(method, this.domain+path, true);
            for(var tkey in headers){
                xhttp.setRequestHeader(tkey,headers[tkey]);
            }
            xhttp.send();
        };

        this.loadLabels = function(onLoad){
            this.request('/0.1/labels',{
                headers:this.requestHeaders,
                onComplete:function(result){
                    self.$labels = JSON.parse(result);
                    onLoad();
                }
            });
        };

        this.getLabels = function(sportId){
            for(var l=0;l<self.$labels.length;l++){
                //console.log(self.$labels[l].sport.id,$type(self.$labels[l].sport.id),sportId,$type(sportId));
                if (self.$labels[l].sport.id==sportId) {
                    return self.$labels[l];
                }
            }
        };

        this.getLabel = function(sportId,period,type){
            var leagueLabels = self.getLabels(sportId);
            console.log(sportId,leagueLabels);
            for(var p=0;p<leagueLabels.labels.length;p++) {
                if (leagueLabels.labels[p].period==period){
                    var labels = leagueLabels.labels[p];
                    console.log(sportId,period,labels);
                    for(var t=0;t<labels.marketLabels.length;t++){
                        if (labels.marketLabels[t].type==type) {
                            var label = labels.marketLabels[t];
                            return {
                                period:period,
                                periodText:labels.periodLabel.full,
                                type:type,
                                typeText:label.full
                            };
                        }
                    }
                }
            }
        };

        this.loadSports = function(onLoad){
            this.request('/0.1/sports',{
                headers:this.requestHeaders,
                onComplete:function(result){
                    var sportsData = JSON.parse(result);
                    var count = sportsData.length;
                    var list = [];
                    for(var i=0;i<count;i++){
                        var value = sportsData[i];
                        var name = value.name;
                        var label = name;
                        switch(name){
                            case 'Water Polo':
                                name = 'Waterpolo';
                                label = 'Waterpolo';
                                break;
                        }
                        list.push({
                            id:value.id,
                            name:name,
                            label:label
                        });
                    }
                    onLoad(list);
                }
            });
        };

        this.loadLeagues = function(sportId,onLoad){
            console.log(sportId);
            self.$currentSport = sportId;
            this.request('/0.1/sports/'+sportId+'/leagues',{
                headers:this.requestHeaders,
                onComplete:function(result){
                    var leaguesData = JSON.parse(result);
                    var list = [];
                    leaguesData.forEach(function(league){
                        list.push({
                            id:league.id,
                            name:league.name,
                            group:league.group,
                            sport:league.sport.name
                        });
                    });
                    onLoad(list);
                }
            });
        };

        this.loadEvents = function(leagueId,onLoad){
            self.request('/0.1/leagues/'+leagueId+'/matchups',{
                headers:self.requestHeaders,
                onComplete:function(matchupresult){
                    self.request('/0.1/leagues/'+leagueId+'/markets/straight',{
                        headers:self.requestHeaders,
                        onComplete:function(marketResult){
                            var marketsData = JSON.parse(marketResult);
                            var marketIndex = {};
                            marketsData.forEach(function(market){
                                if (marketIndex[market.matchupId]==null){
                                    marketIndex[market.matchupId] = [];
                                }
                                marketIndex[market.matchupId].push(market);
                            });

                            var matchupsData = JSON.parse(matchupresult);
                            var list = [];

                            console.log('Events Loaded');
                            matchupsData.forEach(function(matchup){
                                if ($defined(matchup.parent)) return;
                                console.log(matchup);
                                var sportEvent = {
                                    id:matchup.id,
                                    group:matchup.league.group,
                                    league:matchup.league.name,
                                    sport:matchup.league.sport.name,
                                    schedule:matchup.startTime,
                                    markets:[]
                                };
                                var participants = $defined(matchup.parent)?matchup.parent.participants:matchup.participants;
                                participants.forEach(function(participant){
                                    var field = participant.alignment;
                                    sportEvent[field] = participant.name;
                                });

                                var participantIndex;

                                if ($defined(matchup.parent)) {
                                    participantIndex = {};
                                    console.log(matchup.participants);
                                    matchup.participants.forEach(function(participant){
                                        participantIndex[participant.id] = participant;
                                    });
                                    console.log('Participant Index',participantIndex);
                                }

                                if ($defined(marketIndex[matchup.id])) {
                                    marketIndex[matchup.id].forEach(function(market){
                                        switch(market.type){
                                            case 'total':
                                                if (!market.period && !market.isAlternate){
                                                    console.log(market);
                                                    market.prices.forEach(function(price){
                                                        var moneyline = price.price;
                                                        var decimal = 0;
                                                        if (moneyline >= 0) {
                                                            decimal = (moneyline / 100.0) + 1;
                                                        } else {
                                                            decimal = (100 / -moneyline) + 1;
                                                        }
                                                        decimal = decimal.toFixed(3);
                                                        var field;
                                                        if ($defined(matchup.parent)) {
                                                            console.log(participantIndex[price.participantId]);
                                                            if ($defined(participantIndex[price.participantId])) {
                                                                field = participantIndex[price.participantId].name;
                                                            }
                                                        } else {
                                                            field = price.designation;
                                                        }

                                                        if ($defined(field)) {
                                                            sportEvent['market_'+field.toLowerCase()]=decimal;
                                                        }

                                                        if (!$defined(sportEvent.special)) {
                                                            sportEvent.special=price.points;
                                                        }
                                                    });
                                                }
                                                break;
                                            case 'moneyline':
                                                if (!market.period && market.status!='closed'){
                                                    console.log(market);
                                                    market.prices.forEach(function(price){
                                                        var moneyline = price.price;
                                                        var decimal = 0;
                                                        if (moneyline >= 0) {
                                                            decimal = (moneyline / 100.0) + 1;
                                                        } else {
                                                            decimal = (100 / -moneyline) + 1;
                                                        }
                                                        decimal = decimal.toFixed(3);
                                                        //var odds = (Math.abs(price.price)/(Math.abs(price.price)+100))*100;
                                                        //var decimal = 100/odds;
                                                        var field;
                                                        switch(price.designation){
                                                            case 'home':
                                                                field = '1';
                                                                break;
                                                            case 'away':
                                                                field = '2';
                                                                break;
                                                            case 'draw':
                                                                field = 'x';
                                                                break;
                                                        }
                                                        console.log(price.designation,field,price.price,decimal);
                                                        if ($defined(field)){
                                                            sportEvent['market_'+field.toLowerCase()]=decimal;
                                                        }
                                                    });
                                                }
                                                break;
                                        }
                                    });
                                }
                                console.log(marketIndex[matchup.id]);
                                list.push(sportEvent);
                            });
                            onLoad(list);
                        }
                    });

                }
            });
        };

        this.loadMarketRelated=function(eventId,onLoad){
            this.request('/0.1/matchups/'+eventId+'/related',{
                headers:this.requestHeaders,
                onComplete:function(result){
                    self.$related = JSON.parse(result);
                    onLoad();
                }
            });
        };

        this.getMarketRelation=function(id){
            var count = self.$related.length;
            for(var i=0;i<count;i++){
                if (self.$related[i].id==id){
                    return self.$related[i];
                }
            }
        };

        this.loadMarkets=function(eventId,onLoad){
            self.loadMarketRelated(eventId,function(){
                self.request('/0.1/matchups/'+eventId+'/markets/related/straight',{
                    headers:self.requestHeaders,
                    onComplete:function(result){
                        var marketsData = JSON.parse(result);
                        var labels = {};
                        var list = [];
                        marketsData.forEach(function(market){
                            //var related = self.getMarketRelation(market.matchupId);
                            var label = self.getLabel(self.$currentSport,market.period,market.type);
                            var name = label.typeText+' - '+label.periodText;
                            if (!$defined(labels[name])) {
                                labels[name] = {
                                    //eventId:eventId,
                                    //id:market.matchupId,
                                    name:name,
                                    type:market.type,
                                    typeText:label.typeText,
                                    group:label.periodText,
                                    items:[]
                                    // period:market.period,
                                    //markets:market.prices,
                                    //label:label
                                };
                            }
                            market.prices.forEach(function(price){
                                var itemName = price.designation;
                                if (price.points!=null) {
                                    itemName += ' '+price.points;
                                }
                                labels[name].items.push({
                                    name:itemName,
                                    value:priceToMoneyline(price.price)
                                });
                            });
                        });
                        for(var lid in labels){
                            list.push(labels[lid]);
                        }
                        onLoad(list);
                        console.log(list);
                    }
                });
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

        this.loadLabels(function(){
            console.log('Labels Loaded',self.$labels);
        });
    }
    
    window.BetCrawler = BetCrawler;
})();