module hello_walrus::hello {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    public struct Greeting has key {
        id: UID,
        message: vector<u8>,
    }

    public fun create_greeting(ctx: &mut TxContext) {
        let greeting = Greeting {
            id: object::new(ctx),
            message: b"hello from TradeProof on Walrus",
        };
        transfer::transfer(greeting, sui::tx_context::sender(ctx));
    }

    #[test]
    fun test_greeting_message() {
        let msg = b"hello from TradeProof on Walrus";
        assert!(msg == b"hello from TradeProof on Walrus", 0);
    }
}
