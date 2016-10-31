cartfiller = {
    details: [
        {if: 'param1', then: [
            {_set: {ref: ['param1was'], value: 'set'}},
            {_set: {ref: ['param1wasSetTo'], value: ['param1']}}
        ], else: [
            {_set: {ref: ['param1was'], value: 'not set'}},
        ]}
    ]
}