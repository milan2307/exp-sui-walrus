// seal_policy.move
//
// On-chain access policy for Seal threshold-encrypted trade documents.
//
// Seal (Mysten Labs, testnet) is a threshold encryption service built on Sui.
// Documents are encrypted client-side before upload to Walrus. Only addresses
// listed in an AllowList can request decryption key shares from the Seal service.
//
// This is how TradeProof solves the privacy failure that killed TradeLens:
//   - A BL document is encrypted before it ever leaves the shipper's client.
//   - The ciphertext lands on Walrus. The hash lands on Sui.
//   - Competitors see: "an encrypted blob exists." Nothing else.
//   - Only shipper + consignee + bank hold key shares.
//
// Usage:
//   1. Shipper calls seal_policy::create() with initial authorized parties.
//      Returns the AllowList object ID via AllowListCreated event.
//   2. Shipper passes that ID as seal_id when calling bill_of_lading::issue().
//   3. Any party can call is_authorized() on-chain to verify their access.
//   4. Owner can call authorize() or revoke() to manage parties (e.g. add bank).

module logioracle::seal_policy {
    use std::string::String;

    // ── Error codes ───────────────────────────────────────────────────────────

    const ENotOwner:   u64 = 0;
    const EAlreadyRevoked: u64 = 1;

    // ── Objects ───────────────────────────────────────────────────────────────

    /// Shared on-chain allowlist for a single Seal-encrypted document.
    /// list_id is stored as seal_id in BillOfLading (and any other document module).
    /// The Seal service checks is_authorized() before issuing key shares.
    public struct AllowList has key, store {
        id: sui::object::UID,
        document_type: String,       // "BillOfLading", "CommercialInvoice", etc.
        authorized: vector<address>, // parties that may request decryption
        owner: address,              // who may authorize / revoke parties
        revoked: bool,               // emergency kill-switch
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct AllowListCreated has copy, drop {
        list_id: address,
        owner: address,
        party_count: u64,
    }

    public struct PartyAuthorized has copy, drop {
        list_id: address,
        party: address,
        authorized_by: address,
    }

    public struct PartyRevoked has copy, drop {
        list_id: address,
        party: address,
        revoked_by: address,
    }

    public struct AllowListRevoked has copy, drop {
        list_id: address,
        revoked_by: address,
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Create a new Seal allowlist.
    /// initial_parties typically includes: shipper, consignee, issuing bank.
    /// The AllowList is shared so any party can call is_authorized() to verify.
    /// The caller (shipper) becomes the owner and can manage parties.
    public fun create(
        document_type: String,
        initial_parties: vector<address>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let owner      = sui::tx_context::sender(ctx);
        let id         = sui::object::new(ctx);
        let list_id    = sui::object::uid_to_address(&id);
        let party_count = vector::length(&initial_parties);

        let list = AllowList {
            id,
            document_type,
            authorized: initial_parties,
            owner,
            revoked: false,
        };

        sui::event::emit(AllowListCreated { list_id, owner, party_count });
        sui::transfer::share_object(list);
    }

    // ── Access management ─────────────────────────────────────────────────────

    /// Add an authorized party. Only the owner may call this.
    /// Example: add the consignee's bank when LC is presented.
    public fun authorize(
        list: &mut AllowList,
        party: address,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(list.owner == sui::tx_context::sender(ctx), ENotOwner);
        assert!(!list.revoked, EAlreadyRevoked);
        if (!vector::contains(&list.authorized, &party)) {
            vector::push_back(&mut list.authorized, party);
        };
        let list_id = sui::object::uid_to_address(&list.id);
        sui::event::emit(PartyAuthorized {
            list_id,
            party,
            authorized_by: list.owner,
        });
    }

    /// Remove a party's access. Only the owner may call this.
    /// Example: revoke bank access after BL is surrendered.
    public fun revoke_party(
        list: &mut AllowList,
        party: address,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(list.owner == sui::tx_context::sender(ctx), ENotOwner);
        let (found, idx) = vector::index_of(&list.authorized, &party);
        if (found) {
            vector::remove(&mut list.authorized, idx);
        };
        let list_id = sui::object::uid_to_address(&list.id);
        sui::event::emit(PartyRevoked {
            list_id,
            party,
            revoked_by: list.owner,
        });
    }

    /// Emergency revoke — disables all decryption for this document.
    /// Use when a BL is surrendered and no further access should be granted.
    public fun revoke_all(
        list: &mut AllowList,
        ctx: &sui::tx_context::TxContext
    ) {
        assert!(list.owner == sui::tx_context::sender(ctx), ENotOwner);
        list.revoked = true;
        let list_id = sui::object::uid_to_address(&list.id);
        sui::event::emit(AllowListRevoked { list_id, revoked_by: list.owner });
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    public fun is_authorized(list: &AllowList, party: address): bool {
        !list.revoked && vector::contains(&list.authorized, &party)
    }

    public fun get_authorized(list: &AllowList): &vector<address> { &list.authorized }
    public fun get_owner(list: &AllowList): address   { list.owner }
    public fun get_document_type(list: &AllowList): String { list.document_type }
    public fun is_revoked(list: &AllowList): bool     { list.revoked }
    public fun get_id(list: &AllowList): address      { sui::object::uid_to_address(&list.id) }
}
