cartfiller = {
    details: [
        /**
         * Sometimes you may want paste whole blocks of text into your tests without need to format
         * it according to JSON or JS. There is no such way in JSON as far as I know, so there is a
         * CDATA idea got from XML for this purpose. Of course your IDE will get mad
         */
        {_say: {message: "<![CDATA[
This let's
    you have any non-JSON-friendly 
    text here" with quotas, newlines", etc
            ]]>", pre: true}},

        /**
         * In order to make IDE happy there is another workaround: 
         */
        {_say: {message: function() { /*
This let's
    you have any non-JSON-friendly 
    text here" with quotas, newlines", etc
        */}, pre: true}}
    ]
}