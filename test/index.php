<?php
define('DS',DIRECTORY_SEPARATOR);
require_once('remote.php');

$server = 'api.pinnacle.com';
$username = 'JY1201355';
$password = 'javysys78';

$authCode = base64_encode($username.':'.$password);

$commands = array(
    'sports'=>'/0.1/sports/4/matchups'
);

$remote = new Remote('https://api.arcadia.pinnacle.com',array(
    'errorFile'=>dirname(__FILE__).DS.'error.txt'
));

$content = $remote->get($commands['sports'],array(
    'httpheaders'=>1,
    'headers'=>array(
        'origin: https://www.pinnacle.com',
        'referer: https://www.pinnacle.com/en/basketball/matchups',  
        'x-api-key: CmX2KcMrXuFmNg6YFbmTxE0y9CIrOi0R',
        'x-device-uuid: ffff4157-6f243bfa-b4ba69c4-c901434f',
        'x-session: 5rQsGeicLjsGVebarNIt9piMuXiMuy2G',
        //'Authorization: Basic '.$authCode,
        'Accept: application/json'
    )
),'json');

var_dump($content);
var_dump($remote->_info);
?>