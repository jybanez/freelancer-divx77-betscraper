<html>
    <head>
        <script type="text/javascript" src="assets/js/mootools.js"></script>
        <script type="text/javascript" src="assets/js/mootools.helper.js"></script>
        <script type="text/javascript" src="assets/js/common.js"></script>
        
        <link rel="stylesheet" href="assets/css/font-awesome.min.css" />
        <link rel="stylesheet" href="assets/css/common.css" />
        <link rel="stylesheet" href="assets/css/styles.css" />
        
        <script type="text/javascript" src="assets/js/scripts.js"></script>
        <script type="text/javascript" src="https://cdn.ably.io/lib/ably.min-1.js"></script>
        
        <title>Bet Scraper</title>
    </head>
    <body class="fullHeight">
        <div class="row fullHeight">
            <div class="width_300 columns fullHeight">
                <div class="fullHeight">
                    <ul class="selectList">
                        <li class="header">
                            <h2>Betting Sites</h2>
                        </li>
                    </ul>
                    <div>
                        <ul class="fieldList spaced separated siteList"><li></li></ul>    
                    </div>
                    <ul class="selectList">
                        <li class="header">
                            <h3>Commands</h3>
                        </li>
                        <li>
                            <div class="btn primary rounded block appAction" rel="loadSports">
                                <div>
                                    <div class="padded">Load Sports</div>
                                </div>
                            </div>
                        </li>
                        <li class="header">
                            <h2>Common Sports</h2>
                        </li>
                    </ul>    
                    <div class="fullHeight">
                        <ul class="fieldList spaced commonSportList separated"></ul>
                    </div>
                </div>
                
            </div>
            <div class="divider_left columns fullHeight">
                <div class="fullHeight">
                    <div class="row fullHeight canvasList">
                        
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>