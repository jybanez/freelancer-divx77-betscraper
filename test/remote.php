<?php
require_once('uri.php');

class Remote {
    var $domain = '';
    var $cacheFile = '';
    var $cookieFile = '';
    var $errorFile = '';
    
    function __construct($domain,$options=array()) {
        $this->domain = $domain;
        if (!empty($options['cacheFile'])) $this->cacheFile = $options['cacheFile'];
        if (!empty($options['cookieFile'])) $this->cookieFile = $options['cookieFile'];
        if (!empty($options['errorFile'])) $this->errorFile = $options['errorFile'];
    }
    
    function getInfo(){
        return (object)$this->_info;
    }
    
    function fetch($url,$params=array()){
        echo '<br />Fetch : '.$url;
        var_dump($params);
        $ch =  curl_init();
        
        if (!empty($params['query'])) {
            $url = new JURI($url);
            foreach($params['query'] as $key=>$value){
                $url->setVar($key,$value);
            }
            $url = $url->toString();
        }

        $useragent = isset($params['useragent']) ? $params['useragent'] : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:52.0) Gecko/20100101 Firefox/52.0';
    
        curl_setopt( $ch, CURLOPT_URL, $url );
        curl_setopt( $ch, CURLOPT_FAILONERROR,true);
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_AUTOREFERER, true );
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
        curl_setopt( $ch, CURLOPT_POST, isset($params['post']) );
        
        if( isset($params['cached'])) {
            $fresh = !$params['cached']?1:0;
            curl_setopt ($ch, CURLOPT_FRESH_CONNECT, $fresh);
            
        }
        if( isset($params['httpheaders'])) curl_setopt($ch, CURLOPT_HTTPHEADER, $params['httpheaders']);
        if( isset($params['headers']))      curl_setopt($ch, CURLOPT_HEADER, $params['headers']?1:0);
        if( isset($params['post']))         curl_setopt($ch, CURLOPT_POSTFIELDS, $params['post'] );
        if( isset($params['refer']))        curl_setopt($ch, CURLOPT_REFERER, $params['refer'] );
        if( isset($params['newSession']))   curl_setopt($ch, CURLOPT_COOKIESESSION, $params['newSession']?1:0);
    
        curl_setopt( $ch, CURLOPT_USERAGENT, $useragent );
        curl_setopt( $ch, CURLOPT_CONNECTTIMEOUT, ( isset($params['timeout']) ? $params['timeout'] : 5 ) );
        
        if (!empty($this->cookieFile)) {
            curl_setopt( $ch, CURLOPT_COOKIEJAR,  $this->cookieFile );
            curl_setopt( $ch, CURLOPT_COOKIEFILE, $this->cookieFile );    
        }
        
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
        $result = curl_exec( $ch );
        $this->_info = curl_getinfo($ch);
        
        if ($result===false && !empty($this->errorFile)) {
            $entry = implode("\t",array(time(),curl_error($ch)));
            file_put_contents($this->errorFile, "\n".$entry, FILE_APPEND);
        }
        curl_close( $ch );
        var_dump($result);
        return $result;
    }
    
    function cleanHTML($content) {
        $content = preg_replace('/<script[>|\s*>]([\s|\S]*?)<\/script>/','',$content);
        $content = preg_replace('/<style[>|\s*>]([\s|\S]*?)<\/style>/','',$content);
        //preg_replace("/<img[^>]+\>/i", "", $string)
        $content = preg_replace('/<link[^>]+\>/i','',$content);
        $content = preg_replace('/<\![^>]+\>/i','',$content);        
        //$content = TPHTools::compressHTML($content);
        
        return $content;
    }
    
    function cleanHead($content){
        preg_match('/<head[>|\s*>]([\s|\S]*?)<\/head>/',$content,$head);
        return $this->cleanHTML($head[0]);
    }
    
    function cleanBody($content){
        preg_match('/<body[>|\s*>]([\s|\S]*?)<\/body>/',$content,$body);
        return $this->cleanHTML($body[0]);
    }

    function getElementProperties($el) {
        $data = new stdClass();
        foreach($el->attributes as $attribute) {
            $data->{$attribute->name} = $attribute->value;  
        }
        return $data;
    }

    function toData($content){        
        $doc = new DOMDocument();
        $doc->loadHTML($content);
        
        $xpath = new DOMXPath($doc);
        $els = $xpath->query('//input | //select | //textarea');
        
        $data = new stdClass();
        
        foreach($els as $el) {
            $properties = $this->getElementProperties($el);
            switch($el->tagName){
                case 'input':
                    switch($properties->type){
                        case 'checkbox':
                            unset($value);
                            if (!empty($properties->name)) {
                                if (!empty($properties->checked)) {
                                    $value[] = $properties->value;    
                                }
                            }
                            $data->{$properties->name} = $value;
                            break;
                        case 'radio':
                            unset($value);
                            if (!empty($properties->name)) {
                                if (!empty($properties->checked)) {
                                    $value = $properties->value;    
                                }
                            }
                            $data->{$properties->name} = $value;
                            break;
                        default:
                            if (!empty($properties->name)) {
                                $data->{$properties->name} = $properties->value;
                            }
                    }
                    break;
                case 'select':
                    $value='';
                    if ($el->hasChildNodes()) {
                        unset($values);
                        foreach($el->childNodes as $option) {
                            $prop = $this->getElementProperties($option);
                            if (!empty($prop->selected)) {
                                $values[] = $prop->value;
                            }
                        }
                        $value = count($values)>1?$values:$values[0];
                    }
                    $data->{$properties->name} = $value;
                    break;
                default:
                    if (!empty($properties->name)) {
                        $data->{$properties->name} = $properties->value;
                    }
            }
        }  
        
        return $data;
    }

    function getPage($path){
        $url = new JURI($this->domain);
        $url->setPath($path);
        return $url->toString();
    }
    
    function processContent($content,$format) {
        switch($format){
            case 'json':
                $content = json_decode($content);
                break;                
            case 'head':
                $content = $this->cleanHead($content);
                break;
            case 'body':
                $content = $this->cleanBody($content);
                break;
            default:
                $content = trim($content);
                break;
        }
        return $content;
    }

    function get($path,$params=array(),$format='body'){
        $page = $this->getPage($path);
        $content = $this->fetch($page,array_merge(array(
            'refer'=>$page
        ),$params));
        
        return $this->processContent($content,$format);
    }
    
    function post($path,$postData,$params=array(),$format='body') {
        $page = $this->getPage($path);
        $content = $this->fetch($page,array_merge(array(
            'post'=>http_build_query($postData),
            'refer'=>$page
        ),$params));
        return $this->processContent($content,$format);
    }
}
?>