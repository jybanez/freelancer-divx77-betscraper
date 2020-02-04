var BetController = new Class({
	Implements:[
		Events,Options,
		TPH.Implementors.Templates
	],
	options:{
		sites:[
			{
				id:'betrebels',
				name:'Bet Rebels',
				link:'https://www.betrebels.gr/sports'
			},{
				id:'championsbet',
				name:'Champions Bet',
				link:'https://sports1.championsbet.net/pregame'
			},{
				id:'pinnacle',
				name:'Pinnacle',
				link:'https://www.pinnacle.com/en/'
			}
		],
		templates:{
			commonSport:'<div class="padded font bold">{sport}</div>'
						+'<div class="padded">'
							+'<div class="btn secondary rounded block viewLeagues">'
								+'<div class="padded">'
									+'<div>View Leagues</div>'
								+'</div>'
							+'</div>'
						+'</div>'
						,
			commonLeague:'<div class="padded">'
							+'<div class="font bold">{league}</div>'
							+'<ul class="fieldList spaced fixed separated leagueList font small"></ul>'
						+'</div>'
						,
			leagueList:'<div class="">{group}</div>'
						+'<div class="width_100">'
							+'<div class="btn secondary rounded block viewEvents"><div>Load Events</div></div>'
						+'</div>',
			site:'<div class="padded">'
					+'<div class="font bold">{name}</div>'
					+'<div>{link}</div>'
				+'</div>'		
				+'<div class="width_25 align_center font largest">'
					+'<i class="fa fa-check-circle color-green hasValue" data-field="loaded" data-value="1"></i>'
					+'<i class="fa fa-circle color-grey notValueCheck" data-field="loaded"></i>'
				+'</div>'
				
		},
		ablyKey:'1WanEw.nso3Pg:PSRclZWpBMfJOVAn'
	},
	initialize:function(options){
		this.setOptions(options);
		var container = document.id(window.document.body);
		var canvasList = container.getElement('.canvasList');
		this.scanActions(container);
		
		this.containers = new TPH.ContentContainer(null,{
			onCreate:function(containerName,el){
				switch(containerName){
					case 'sports':
						this.$commonSportList = el.getElement('.commonSportList');
						break;
					case 'leagues':
						this.$commonLeagueList = el.getElement('.commonLeagueList');
						break;
				}
			}.bind(this),
			onSelect:function(containerName,instance){
				$fullHeight(instance.getContainer(containerName).getParent());
			}.bind(this)
		});
		
		
		
		this.$ably = new Ably.Realtime(this.options.ablyKey);
		this.options.sites.each(function(site){
			var el = new Element('div',{
				'class':'fullHeight columns'
			}).inject(canvasList);

			site.$instance = new BetSite[site.id.ucfirst()](el,{
				data:site,
				onListSports:function(instance){
					this.findCommonSports();
				}.bind(this),
				onListLeagues:function(instance){
					this.findCommonLeagues();
				}.bind(this)
			}).setChannel(this.$ably.channels.get(site.id)); 
		}.bind(this));
		(function(){
			window.fireEvent('resize');	
		}.delay(100,this));
	},
	scanActions:function(container){
		container.getElements('.appAction').each(function(el){
			el.addEvent('click',function(e){
				this[el.get('rel')]();	
			}.bind(this));
		}.bind(this));
		return this;
	},
	getSite:function(siteId) {
		var count = this.options.sites.length;
		for(var i=0;i<count;i++){
			if (this.options.sites[i].id==siteId){
				return this.options.sites[i];
			}
		}
	},
	loadSports:function(){
		console.log('Load Sports');
		this.options.sites.each(function(site){
			site.$instance.load('sports');
		}.bind(this));
	},
	loadLeagues:function(sport){
		this.containers.select('leagues');
		console.log(sport);
		this.options.sites.each(function(site){
			var sportData = site.$instance.getSport(sport);
			//console.log(sportData);
			site.$instance.load('leagues',[sportData.id]);
		}.bind(this));
	},
	findCommonSports:function(){
		console.log('Find Common Sports');
		this.$commonSportList.empty();
		var global = [],
			siteIndex = [],
			sportIndex = {};
		this.options.sites.each(function(site){
			var index = site.$instance.getSportIndex();
			if (index.length) {
				site.$instance.$sports.each(function(sport){
					if ($defined(sport.$row)) {
						sport.$row.setProperty('class','');
					}
				});
				siteIndex.push(site.id);
				sportIndex[site.id] = index;
				global.combine(index);	
			}
		}.bind(this));

		var common = [], siteCount = siteIndex.length;
		
		console.log(siteCount,global);
		if (siteCount<2) return;
		
		global.each(function(sport){
			var hasCount = 0;
			for(siteId in sportIndex){
				if (sportIndex[siteId].contains(sport)) {
					hasCount++;
				}
			}
			console.log(sport,hasCount);
			if (hasCount==siteCount) {
				common.push(sport);
				var row = new Element('li').inject(this.$commonSportList);
				this.applyTemplateData(row,this.options.templates.commonSport,{
					sport:sport.toUpperCase()
				});
				row.getElement('.viewLeagues').addEvent('click',function(){
					this.loadLeagues(sport);
				}.bind(this));
			}
		}.bind(this));
		
		this.options.sites.each(function(site){
			common.each(function(sport){
				var sportData = site.$instance.getSport(sport);
				if ($defined(sportData)) {
					sportData.$row.addClass('filled green color-white');	
				}
			}.bind(this));
		}.bind(this));
	},
	findCommonLeagues:function(){
		console.log('Find Common Leagues');
		this.$commonLeagueList.empty();
		var global = [],
			siteIndex = [],
			leagueIndex = {};
		this.options.sites.each(function(site){
			if ($defined(site.$instance.$currentSport)) {
				var sportId = site.$instance.$currentSport.id;
				var index = site.$instance.getLeagueIndex();
				
				//console.log(sportId);
				if (index.length) {
					site.$instance.$leagues[sportId].each(function(league){
						if ($defined(league.$row)) {
							league.$row.setProperty('class','');
						}
					});
					siteIndex.push(site.id);
					leagueIndex[sportId] = index;
					global.combine(index);	
				}	
			}
			
		}.bind(this));
		
		var common = [], 
			siteCount = siteIndex.length;
			
		console.log(siteCount,global);
		if (siteCount<2) return;
		
		global.each(function(league){
			var hasCount = 0,
				leagueCollection = new Array();
			this.options.sites.each(function(site){
				if (site.$instance.inLeagueIndex(league)) {
					leagueCollection.push({
						site:site.name,
						siteId:site.id,
						items:site.$instance.getLeaguesByIndex(league)
					});
					hasCount++;
				}
			}.bind(this));
			
			//console.log(league,hasCount);
			if (hasCount==siteCount) {
				common.push(league);
				console.log(leagueCollection);
				
				var row = new Element('li').inject(this.$commonLeagueList);
				this.applyTemplateData(row,this.options.templates.commonLeague,{
					league:league.toUpperCase()
				});
				var leagueList = row.getElement('.leagueList'),
					groupCollection = {};
				leagueCollection.each(function(leagueData){
					leagueData.items.each(function(leagueDefinition){
						if (!$defined(groupCollection[leagueDefinition.group])) {
							groupCollection[leagueDefinition.group] = [];
						}
						
						groupCollection[leagueDefinition.group].push($merge(leagueDefinition,{siteId:leagueData.siteId}));
						leagueDefinition.$row.addClass('filled green color-white');
					}.bind(this));
				}.bind(this));
				//console.log(league,groupCollection);
				//return;
				var hasLeagues = false;
				for(group in groupCollection){
					if (groupCollection[group].length==siteCount) {
						var row = new Element('li').inject(leagueList);
						this.applyTemplateData(row,this.options.templates.leagueList,{group:group});
						hasLeagues = true;
						
						var viewEvents = row.getElement('.viewEvents');
						viewEvents.store('data',groupCollection[group]);
						viewEvents.addEvent('click',function(e){
							e.target.getParent().retrieve('data').each(function(leagueData){
								var site = this.getSite(leagueData.siteId);
								//console.log(leagueData.siteId,primaryLeague);
								site.$instance.load('events',[leagueData.id]);
							}.bind(this));
						}.bind(this));
					}
				}
				
				if (!hasLeagues) {
					row.destroy();
				}
			}
		}.bind(this));
	}
});

var BetSite = new Class({
	Implements:[Events,Options,TPH.Implementors.TemplateData],
	options:{
		classes:'columns fullHeight',
		templates:{
			loading:'<div class="padded"><div class="preloader"></div><div class="padded font small align_center">Fetching data from {name}. Please wait...</div></div>',
			content:'<div class="fullHeight">'
						+'<ul class="selectList">'
							+'<li class="header"></li>'
						+'</ul>'
						+'<div class="fullHeight body border_top">'
						+'</div>'
					+'</div>',
			header:'<ul class="fieldList spaced">'
						+'<li>'
							+'<a class="propertyContent" data-property="href" data-content="{link}" target="_blank">'
								+'<h2>{name}</h2>'
								+'<h3>{link}</h3>'
							+'</a>'
							+'<div class="width_25 align_center font largest">'
								+'<i class="fa fa-check-circle color-green hasValue" data-field="loaded" data-value="1"></i>'
								+'<i class="fa fa-circle color-grey notValueCheck" data-field="loaded"></i>'
							+'</div>'
						+'</li>'
					+'</ul>',
			sportList:'<ul class="fieldList spaced sportList separated counter"></ul>',
			sportItem:'<div class="padded">'
						+'<div class="font bold">{label}</div>'
						+'<div class="font smaller">ID:{id}</div>'
					+'</div>'
					//+'<i class="fa fa-chevron-right control active"></i>'
					,
			leagueList:'<ul class="selectList">'
						+'<li class="header">'
							+'<h2>{name}</h2>'
						+'</li>'
					+'</ul>'
					+'<div class="fullHeight border_top"><ul class="selectList leagueList separated"></ul></div>',
			leagueGroup:'<div class="sportLeague">'
					+'<div>'
						+'<ul class="selectList">'
							+'<li class="header">'
								+'<h2>{name}</h2>'
							+'</li>'
							+'<li class="padded">'
								+'<ul class="fieldList spaced leagueItems separated counter"></ul>'
							+'</li>'
						+'</ul>'
						+'</div>'
					+'</div>'
					,
			leagueItem:'<div class="padded">'
						+'<div class="font bold">{name}</div>'
						+'<div class="font smaller">ID : {id}</div>'
					+'</div>'
					,
			eventList:'<ul class="selectList">'
						+'<li class="header">'
							+'<h2>{name}</h2>'
							+'<h3>{group}</h3>'
							+'<h3>{sport}</h3>'
						+'</li>'
					+'</ul>'
					+'<div class="fullHeight border_top">'
						+'<ul class="selectList eventList separated"></ul>'
					+'</div>',
			eventItem:'<div class="sportEvent">'
						+'<ul class="selectList">'
							+'<li class="header">'
								+'<ul class="fieldList spaced">'
									+'<li>'
										+'<h3>{schedule_text}</h3>'
										+'<h3 class="align_right">{id}</h3>'
									+'</li>'
								+'</ul>'
							+'</li>'
							+'<li class="header">'
								+'<div class="align_center">'
									+'<h2>{home}</h2>'
									+'<h3 class="font bold">vs</h3>'
									+'<h2>{away}</h2>'
								+'</div>'
							+'</li>'
							+'<li class="padded">'
								+'<ul class="fieldList spaced">'
									+'<li class="header">'
										+'<div>1</div>'
										+'<div>X</div>'
										+'<div>2</div>'
										+'<div></div>'
									+'</li>'
									+'<li class="align_center">'
										+'<div class="padded font bold">{market_1}</div>'
										+'<div class="padded font bold">{market_x}</div>'
										+'<div class="padded font bold">{market_2}</div>'
										+'<div class="padded font bold">{sum}</div>'
									+'</li>'
								+'</ul>'
								+'<ul class="fieldList spaced">'
									+'<li class="header">'
										+'<div class="six">O/U {special}</div>'
										+'<div>GG/NG</div>'
									+'</li>'
									+'<li class="align_center">'
										+'<div class="">'
											+'<ul class="fieldList spaced separated fixed">'
												+'<li>'
													+'<div>O</div>'
													+'<div class="font bold">{market_over}</div>'
												+'</li>'
												+'<li>'
													+'<div>U</div>'
													+'<div class="font bold">{market_under}</div>'
												+'</li>'
											+'</ul>'
										+'</div>'
										+'<div class="">'
											+'<ul class="fieldList spaced separated fixed">'
												+'<li>'
													+'<div>GG</div>'
													+'<div class="font bold">{market_gg}</div>'
												+'</li>'
												+'<li>'
													+'<div>NG</div>'
													+'<div class="font bold">{market_ng}</div>'
												+'</li>'
											+'</ul>'
										+'</div>'
									+'</li>'
								+'</ul>'
							+'</li>'
						+'</ul>'						
					+'</div>'
					//+'<i class="fa fa-chevron-right control active"></i>'
					,
				marketList:'<ul class="selectList">'
						+'<li class="header">'
							+'<h2>{home}</h2>'
							+'<h3 class="font bold">vs</h3>'
							+'<h2>{away}</h2>'
						+'</li>'
					+'</ul>'
					+'<div class="fullHeight border_top">'
						+'<ul class="selectList marketList separated"></ul>'
					+'</div>',	
				marketItem:'<div class="padded">'
						+'<div class="font bold">{name}</div>'
						+'<div class="font">Group : {group}</div>'
						+'<div class="font">Type : {typeText}</div>'
					+'</div>'
		}
	},
	initialize:function(container,options){
		this.setOptions(options);
		
		this.container = container.set('html',this.options.templates.content);
		
		this.header = this.container.getElement('.header');
		this.body = this.container.getElement('.body');
				
		this.renderHeader();
		return;
				
	},
	getSite:function(){
		return this.options.data;
	},
	renderHeader:function(){
		this.applyTemplateData(this.header,this.options.templates.header,this.options.data);
	},
	setChannel:function(channel){
		var site = this.options.data;
		this.$channel = channel;
		
		this.$channel.publish('hi',site.id);
		this.$channel.subscribe('hello',function(message){
			var site = this.options.data;
			console.log('Message Received from '+site.name);
			$extend(site,{
				loaded:'1'
			});
			this.renderHeader();
			this.load('sports');
		}.bind(this));
		this.$channel.subscribe('response',function(response){
			var site = this.options.data;
			console.log('Response Received from '+site.name);
			var data = Json.decode(LZString.decompressFromUTF16(response.data));
			var command = data.command.toLowerCase();
			switch(command){
				case 'sports':
					this.setSports(data.result);
					break;
				case 'leagues':
					this.setLeagues(data.arguments[0],data.result);
					break;
				case 'events':
					this.setEvents(data.arguments[0],data.result);
					break;
				case 'markets':
					this.setMarkets(data.arguments[0],data.result);
					break;
			}
			console.log(command,data);
		}.bind(this));
		
		return this;
	},
	load:function(command,args){
		//console.log(args);
		switch(command){
			case 'sports':
			case 'leagues':
			case 'events':
			case 'markets':
				this.applyTemplateData(this.body,this.options.templates.loading,this.options.data);
				break;
		}
		this.$channel.publish('load',{
			command:command.ucfirst(),
			arguments:args
		});
	},
	setSports:function(items){
		this.$sports = items;
		this.listSports();
	},
	getSport:function(name){
		if (!$defined(this.$sports)) return;
		var name = name.toLowerCase();
		var count = this.$sports.length;
		for(var i=0;i<count;i++){
			if (this.$sports[i].name.toLowerCase()==name){
				return this.$sports[i];
			}
		}
	},
	getSportById:function(id){
		if (!$defined(this.$sports)) return;
		var count = this.$sports.length;
		for(var i=0;i<count;i++){
			if (this.$sports[i].id==id){
				return this.$sports[i];
			}
		}
	},
	getSportIndex:function(){
		var idx = new Array();
		if (!$defined(this.$sports)) return idx;
		
		this.$sports.each(function(sport){
			idx.push(sport.name.toLowerCase());
		});
		return idx;
	},
	listSports:function(){
		if (!$defined(this.$sports)) return;
		this.body.set('html',this.options.templates.sportList);
		var sportList = this.body.getElement('.sportList');
		this.$sports.sortBy('name').each(function(sport){
			sport.$row = new Element('li').inject(sportList);
			this.applyTemplateData(sport.$row,this.options.templates.sportItem,sport);
		}.bind(this));
		this.fireEvent('onListSports',[this]);
	},
	setLeagues:function(sportId,items){
		if (!$defined(this.$leagues)) {
			this.$leagues = {};	
		}
		items.each(function(item){
			this.initLeague(item);
		}.bind(this));
		this.$leagues[sportId] = items;
		
		//console.log(this.$leagues);
		this.listLeagues(sportId);
	},
	initLeague:function(league){
		$extend(league,{
			group:league.group.length?league.group:'- Ungrouped -',
			index:this.generateLeagueIndex(league)
		});
	},
	generateLeagueIndex:function(league){
		return [league.name.toLowerCase()];
	},
	getLeagueIndex:function(){
		var idx = new Array();
		if (!$defined(this.$currentSport)) return idx;
		var sportId = this.$currentSport.id;
		if (!$defined(this.$leagues[sportId])) return idx;
		
		this.$leagues[sportId].each(function(league){
			idx.combine(league.index);
		});
		return idx;
	},
	inLeagueIndex:function(value){
		return this.getLeagueIndex().contains(value); 
	},
	getLeaguesByIndex:function(index){
		var leagues = new Array();
		if (!$defined(this.$currentSport)) return leagues;
		var sportId = this.$currentSport.id;
		if (!$defined(this.$leagues[sportId])) return leagues;
		this.$leagues[sportId].each(function(league){
			if (league.index.contains(index)) {
				leagues.push(league);
			}
		}.bind(this));
		return leagues;
	},
	getLeagueById:function(sportId,id){
		if (!$defined(this.$leagues[sportId])) return;
		var count = this.$leagues[sportId].length;
		for(var i=0;i<count;i++){
			if (this.$leagues[sportId][i].id==id){
				return this.$leagues[sportId][i];
			}
		}
	},
	listLeagues:function(sportId){
		console.log(sportId);
		if (!$defined(this.$leagues)) return;
		this.$currentSport = this.getSportById(sportId);
		this.applyTemplateData(this.body,this.options.templates.leagueList,this.$currentSport);
		$fullHeight(this.container);
		
		var leagueList = this.body.getElement('.leagueList');
		var groupIndex = {};
		this.$leagues[sportId].each(function(league){
			var group = league.group;
			if (!$defined(groupIndex[group])) {
				groupIndex[group] = {
					name:group.length?group:'- Ungrouped -',
					$row:new Element('li').inject(leagueList),
					items:[]
				};
				this.applyTemplateData(groupIndex[league.group].$row,this.options.templates.leagueGroup,{
					name:groupIndex[group].name
				}); 
			}
			
			groupIndex[group].items.push(league);
		}.bind(this));
		//console.log(groupIndex);
		for(groupName in groupIndex){
			var group = groupIndex[groupName];
			var leagueItems = group.$row.getElement('.leagueItems');
			group.items.each(function(league){
				league.$row = new Element('li').inject(leagueItems);
				this.applyTemplateData(league.$row,this.options.templates.leagueItem,league);
				league.$row.addEvent('click',function(){
					this.load('events',[league.id]);
				}.bind(this));
			}.bind(this));
		}
		
		this.fireEvent('onListLeagues',[this]);
	},
	setEvents:function(leagueId,items){
		this.$events = items;
		this.listEvents(leagueId);
	},
	getEventById:function(eventId){
		if (!$defined(this.$events[this.$currentLeague.id])) return;
		var count = this.$events[this.$currentLeague.id].length;
		for(var i=0;i<count;i++){
			if (this.$events[this.$currentLeague.id][i].id==id){
				return this.$events[this.$currentLeague.id][i];
			}
		}
	},
	listEvents:function(leagueId){
		if (!$defined(this.$events)) return;
		this.$currentLeague = this.getLeagueById(this.$currentSport.id,leagueId);
		console.log(this.$currentLeague);
		this.applyTemplateData(this.body,this.options.templates.eventList,$merge(this.$currentLeague,{
			sport:this.$currentSport.name
		}));
		$fullHeight(this.container);
		
		var eventList = this.body.getElement('.eventList');
		this.$events.each(function(ev){
			$extend(ev,{
				schedule_text:new Date().parse(ev.schedule).format('db')
			});
			ev.$row = new Element('li').inject(eventList);
			this.applyTemplateData(ev.$row,this.options.templates.eventItem,ev);
			ev.$row.addEvent('click',function(){
				this.load('markets',[ev.id]);
			}.bind(this));
		}.bind(this));
		this.fireEvent('onListEvents',[this]);
	},
	abbreviate:function(str){
		var abbr = '';
		str.split(' ').each(function(word){
			abbr += word.charAt(0);
		});
		return abbr;
	},
	setMarkets:function(eventId,items){
		if (!$defined(this.$markets)) {
			this.$markets = {};	
		}
		items.each(function(item){
			this.initMarket(item);
		}.bind(this));
		this.$markets[eventId] = items;
		console.log(this.$markets);
		this.listMarkets(eventId);
	},
	initMarket:function(item){
		
	},
	listMarkets:function(eventId){
		if (!$defined(this.$markets)) return;
		this.$currentEvent = this.getEventById(eventId);
		console.log(this.$currentLeague);
		this.applyTemplateData(this.body,this.options.templates.marketList,this.$currentEvent);
		$fullHeight(this.container);
		
		var marketList = this.body.getElement('.marketList');
		this.$markets[eventId].each(function(market){
			market.$row = new Element('li').inject(marketList);
			this.applyTemplateData(market.$row,this.options.templates.marketItem,market);
		}.bind(this));
		this.fireEvent('onListMarkets',[this]);
	}
});

BetSite.Betrebels = new Class({
	Extends:BetSite,
	initLeague:function(league){
		this.parent(league);
		league.group = league.group=='Republic of Korea'?'South Korea':league.group; 		
	}
});
BetSite.Championsbet = new Class({
	Extends:BetSite,
	initLeague:function(league){
		switch(league.group) {
			case 'International Clubs':
				league.group = 'World';
				break;
		}
		
		this.parent(league);
		switch(league.name){
			case 'Estonian-Latvian Basketball League':
			case 'Euroleague':
				league.group = 'Europe';
				break;
		} 		
		if (league.name.test('UEFA','i')) {
			league.group = 'Europe';
		}
		
	},
	generateLeagueIndex:function(league){
		var name = league.name.toLowerCase();
		var idx = new Array();
		var parts = name.split(', ');
		
		//var wordCount = parts.length>1?name.split(' ').length:parts[1].split(' ').length;
		var trueName = parts.length>1?parts[0]:name;
		var wordCount = trueName.split(' ').length;
		
		idx.push(trueName);
		if (wordCount>1) {
			idx.push(this.abbreviate(trueName));
		}
		return idx;
	},
	initMarket:function(item){
		switch(item.group){
			case 'Main Markets':
				item.group = 'Main';
				break;
		}
	}
});
BetSite.Pinnacle = new Class({
	Extends:BetSite,
	initLeague:function(league){
		var parts = league.name.split(' - ');
		switch(parts[0]){
			case 'UEFA':
			case 'AFC':
				league.name = parts.join(' ');
				break;
		}
		switch(league.name) {
			case 'Club Friendlies':
				league.name = 'Club Friendly Games';
				break;
		}
		if (league.group.length) {
			this.parent(league);
		} else {
			var parts = league.name.split(' - ');
			var trueName = parts.length>1?parts[1]:name;
			
			$extend(league,{
				group:parts.length>1?parts[0]:'- Ungrouped -',
				index:this.generateLeagueIndex(league)
			});	
		}		
		switch(league.name){
			case 'Estonian-Latvian Basketball League':
				league.group = 'Europe';
				break;
		} 	
		
		switch(league.group){
			case 'Korea':
				league.group = 'South Korea';
				break;
			case 'UEFA':
				league.group = 'Europe';
				//league.name = 'UEFA '+league.name;
				break;
			case 'AFC':
				league.group = 'Asia';
				break;
		}
	},
	generateLeagueIndex:function(league){
		var name = league.name.toLowerCase();
		var idx = new Array();
		var parts = name.split(' - ');
		
		
		//var wordCount = parts.length>1?name.split(' ').length:parts[1].split(' ').length;
		var trueName = parts.length>1?parts[1]:name;
		var wordCount = trueName.split(' ').length;
		
		idx.push(trueName);
		if (wordCount>1) {
			idx.push(this.abbreviate(trueName));
		}
		return idx;
	}
});

window.addEvent('domready',function(){
	new BetController();	
	
});
