module staking_game_addr::staking_game {
    // --- Imports (Unchanged) ---
    use std::signer;
    use std::event;
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;

    // --- Errors (Unchanged) ---
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_NO_GUESSES_PROVIDED: u64 = 2;
    // const E_NOT_ADMIN: u64 = 3; // Removed
    const E_BALANCE_NOT_FOUND: u64 = 4;
    const E_TOTAL_CUBES_CANNOT_BE_ZERO: u64 = 5;
    const E_SELECTED_EXCEEDS_TOTAL: u64 = 6;
    const E_TREASURY_NOT_FOUND: u64 = 7;
    const E_INSUFFICIENT_TREASURY_BALANCE: u64 = 8;

    // --- Constants (Unchanged) ---
    const PRECISION: u128 = 1_000_000_000_000_000_000; // 1e18

    // --- Structs ---

    // REMOVED: `GameAdmin` struct is no longer needed.

    struct PlayerBalance has key {
        balance: Coin<AptosCoin>,
    }
    
    struct Treasury has key {
        balance: Coin<AptosCoin>,
    }

    // --- Events ---
    #[event]
    struct GamePlayedEvent has drop, store { player: address, stake: u64, won: bool, amount_changed: u64, winning_number: u64 }
    
    #[event]
    struct DepositEvent has drop, store { player: address, amount: u64 }
    
    #[event]
    struct WithdrawEvent has drop, store { player: address, amount: u64 }

    // --- Module Initializer ---
    fun init_module(deployer: &signer) {
        // SIMPLIFIED: Only initialize the treasury, no admin setup needed.
        move_to(deployer, Treasury { balance: coin::zero<AptosCoin>() });
    }

    // --- Core Game Logic (Player-Controlled) ---
    public entry fun play_game(
    player: &signer,
    stake_amount: u64,
    guesses: vector<u64>,
    total_cube_number: u64, // WARNING: This parameter still makes the game insecure.
) acquires PlayerBalance, Treasury {
    let player_addr = signer::address_of(player);

    assert!(exists<PlayerBalance>(player_addr), E_BALANCE_NOT_FOUND);
    let player_balance = &mut borrow_global_mut<PlayerBalance>(player_addr).balance;
    assert!(coin::value(player_balance) >= stake_amount, E_INSUFFICIENT_BALANCE);
    assert!(vector::length(&guesses) > 0, E_NO_GUESSES_PROVIDED);

    let treasury_addr = @staking_game_addr;
    assert!(exists<Treasury>(treasury_addr), E_TREASURY_NOT_FOUND);
    let treasury_balance = &mut borrow_global_mut<Treasury>(treasury_addr).balance;

    // 1. Move the player's stake into the treasury to be held in escrow.
    let staked_coins = coin::extract(player_balance, stake_amount);
    coin::merge(treasury_balance, staked_coins);

    let winner_number = get_insecure_pseudo_random_number() % total_cube_number;
    let player_won = check_winning_guesses(&guesses, winner_number);

    if (player_won) {
        let bonus = get_winning_bonus(stake_amount, vector::length(&guesses), total_cube_number);
        let total_payout = stake_amount + bonus;
        
        // Ensure the treasury has enough funds to pay the winner
        assert!(coin::value(treasury_balance) >= total_payout, E_INSUFFICIENT_TREASURY_BALANCE);

        // FIXED: Pay the winner their original stake PLUS the bonus from the treasury.
        let winnings = coin::extract(treasury_balance, total_payout);
        coin::merge(player_balance, winnings);

        event::emit(GamePlayedEvent { player: player_addr, stake: stake_amount, won: true, amount_changed: bonus, winning_number: winner_number });
    } else {
        let loss_amount = get_losing_amount(stake_amount, vector::length(&guesses), total_cube_number);
        let refund_amount = stake_amount - loss_amount;

        // FIXED: Refund the player the portion of their stake they didn't lose.
        if (refund_amount > 0) {
            let refund_coins = coin::extract(treasury_balance, refund_amount);
            coin::merge(player_balance, refund_coins);
        };
        // The `loss_amount` remains in the treasury.

        event::emit(GamePlayedEvent { player: player_addr, stake: stake_amount, won: false, amount_changed: loss_amount, winning_number: winner_number });
    }
}

    // Helper function to check if any guess matches the winner number
    fun check_winning_guesses(guesses: &vector<u64>, winner_number: u64): bool {
        let len = vector::length(guesses);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(guesses, i) == winner_number) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // --- Balance Management and Helpers (Unchanged) ---
    public entry fun deposit(player: &signer, amount: u64) acquires PlayerBalance {
        if (!exists<PlayerBalance>(signer::address_of(player))) {
            move_to(player, PlayerBalance { balance: coin::zero<AptosCoin>() });
        };
        let player_balance = &mut borrow_global_mut<PlayerBalance>(signer::address_of(player)).balance;
        let deposit_coins = coin::withdraw<AptosCoin>(player, amount);
        coin::merge(player_balance, deposit_coins);
        event::emit(DepositEvent { player: signer::address_of(player), amount });
    }

    public entry fun withdraw(player: &signer, amount: u64) acquires PlayerBalance {
        let player_addr = signer::address_of(player);
        assert!(exists<PlayerBalance>(player_addr), E_BALANCE_NOT_FOUND);
        let player_balance_resource = borrow_global_mut<PlayerBalance>(player_addr);
        let player_balance = &mut player_balance_resource.balance;
        assert!(coin::value(player_balance) >= amount, E_INSUFFICIENT_BALANCE);

        let withdraw_coins = coin::extract(player_balance, amount);
        coin::deposit(player_addr, withdraw_coins);
        event::emit(WithdrawEvent { player: player_addr, amount });
    }

    #[view]
    public fun get_player_balance(player_addr: address): u64 acquires PlayerBalance {
        if (exists<PlayerBalance>(player_addr)) {
            coin::value(&borrow_global<PlayerBalance>(player_addr).balance)
        } else { 0 }
    }

    // Placeholder functions - you'll need to implement these based on your game logic
    fun get_insecure_pseudo_random_number(): u64 {
        // This is a placeholder - implement your random number generation
        // WARNING: This should be secure random number generation in production
        let current_time = timestamp::now_microseconds();
        
        // Use modulo to prevent overflow before multiplication
        let time_mod = current_time % 1000000; // Keep timestamp manageable
        
        // Simple linear congruential generator with smaller numbers to prevent overflow
        let a = 1664525u64;  // multiplier
        let c = 1013904223u64; // increment
        let m = 4294967296u64; // modulus (2^32)
        
        ((time_mod * a + c) % m) % 1000000
    }

    fun get_winning_bonus(stake_amount: u64, num_guesses: u64, total_cubes: u64): u64 {
    assert!(total_cubes > 0, E_TOTAL_CUBES_CANNOT_BE_ZERO);
    assert!(num_guesses <= total_cubes, E_SELECTED_EXCEEDS_TOTAL);

    // Calculate the ratio (selected / total) using the precision factor
    let ratio = ((num_guesses as u128) * PRECISION) / (total_cubes as u128);

    // Calculate (1 - ratio)
    let one_minus_ratio = PRECISION - ratio;

    // Calculate bonus: (1 - ratio)^2 * stake_amount
    // We reorder to prevent multiplication overflow
    let bonus = (one_minus_ratio * one_minus_ratio / PRECISION) * (stake_amount as u128) / PRECISION;
    
    (bonus as u64)
}

fun get_losing_amount(stake_amount: u64, num_guesses: u64, total_cubes: u64): u64 {
    assert!(total_cubes > 0, E_TOTAL_CUBES_CANNOT_BE_ZERO);
    
    // To avoid integer division issues, we rearrange the formula to:
    // (selected^2 * stake) / total^2
    let numerator = (num_guesses as u128) * (num_guesses as u128) * (stake_amount as u128);
    let denominator = (total_cubes as u128) * (total_cubes as u128);
    
    ((numerator / denominator) as u64)
}
}