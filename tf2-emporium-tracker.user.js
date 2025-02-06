// ==UserScript==
// @name         TF2 Emporium Tracker
// @version      06.02.2025 2:28
// @description  A browser extension that notifies you if a TF2 Workshop item contains a member of Emporium group, helping you avoid their content.
// @author       https://steamcommunity.com/id/EurekaEffect/
// @match        https://steamcommunity.com/sharedfiles/filedetails/*
// @match        https://steamcommunity.com/id/*/myworkshopfiles/?appid=440*
// @match        https://steamcommunity.com/profiles/*/myworkshopfiles/?appid=440*
// @match        https://steamcommunity.com/workshop/browse/?appid=440*
// @grant        none
// ==/UserScript==

const workshop_item_notification_html = `<div class="detailBox altFooter"><div class="workshopItemDescriptionTitle" style="font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;color: white;font-size: 18px;display: flex;"><span style="text-align: center;text-transform: none;">This Workshop submission has been worked on by a criminal. Below is evidence detailing the things they have done.</span></div><div class="workshopItemDescription" id="highlightContent"><div style="display: flex;justify-content: space-around;"><a class="bb_link" target="_blank" rel="" title="EXPOSING The Group That Ruined The TF2 Workshop" href="https://discord.com/channels/217585440457228290/292291925640216577/476822103706959885"><img src="https://media.discordapp.net/attachments/1336010797603618850/1336658391120085002/drew_and_meta_ban_announcement.png?ex=67a49ba2&amp;is=67a34a22&amp;hm=dd5a9648c64d25c50ca5bf8d5ba77e4eeeeadacb55dfd8259413100d538579cc&amp;=&amp;format=webp&amp;quality=lossless"></a></div><br><a href="https://discord.com/channels/217585440457228290/292291925640216577/476822103706959885" style=" display: flex;justify-content: space-around;font-size: 16px; color: skyblue; font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;">Discord Hyperlink to channel.</a><br><span style="font-size: 16px; color: white;font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;display: flex;justify-content: space-around;"><div>Videos by <a href="https://www.youtube.com/@BigBoiGames" style="text-decoration: underline;">BigBoiGames</a>.</div></span><br><div style="display: flex;justify-content: space-evenly;gap: 1px;"><a class="bb_link" target="_blank" href="https://www.youtube.com/watch?v=nHGXvEFaA2o&amp;t" rel="" title="I made a video exposing the TF2 Workshop Monopoly. They responded."><img src="https://i.ytimg.com/vi/nHGXvEFaA2o/hqdefault.jpg?sqp=-oaymwEcCPYBEIoBSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&amp;rs=AOn4CLD_cpuyiuVcVMnYciWcEfh2Yxrd3w" style="width: 110%;"></a><a class="bb_link" target="_blank" href="https://www.youtube.com/watch?v=tJ0u4dHJeac" rel="" title="EXPOSING The Group That Ruined The TF2 Workshop"><img src="https://i.ytimg.com/vi/tJ0u4dHJeac/hqdefault.jpg?sqp=-oaymwEcCPYBEIoBSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&amp;rs=AOn4CLB7dj_PMvp8q7DZvjMLVGKmFcHj1w" style="width: 110%;"></a></div></div></div>`;
// const emporium_source = 'https://raw.githubusercontent.com/EurekaEffect/TF2-Emporium-Tracker/refs/heads/main/emporium-members.json';

(async function() {
    'use strict';

    // FIXME: Content Security Policy.
    // window.emporium_members = await fetch(emporium_source).then(async (response) => await response.json())
    window.emporium_members = {
        '76561198043855981': 'Metabolic',
        '76561198011507712': 'Drew'
    }
    window.is_page_flagged = false

    const workshop_item_regex = /^https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/.*$/;
    const workshop_profile_regex = /^https:\/\/steamcommunity\.com\/(id|profiles)\/[^\/]+\/myworkshopfiles\/\?appid=440\d*.*$/;
    const workshop_regex = /^https:\/\/steamcommunity\.com\/workshop\/browse\/\?appid=440.*$/;

    const current_url = document.location.href

    window.isEmporiumMember = function (steam_id) {
        return (steam_id in window.emporium_members)
    }

    window.getProfileObject = function (html) {
        let profileData = null;

        $J(html).find('script').each(function() {
            const scriptContent = $J(this).text();

            if (scriptContent.includes('g_rgProfileData =')) {
                const match = scriptContent.match(/g_rgProfileData = (\{.*\});/);

                if (match && match[1]) {
                    try {
                        profileData = JSON.parse(match[1]);
                    } catch (error) {
                        console.error('Error parsing g_rgProfileData:', error);
                    }
                }
            }
        });

        return profileData;
    }
    window.parseProfileId = function (url) {
        const regexId = /https:\/\/steamcommunity\.com\/id\/([^\/]+)/;
        const regexProfile = /https:\/\/steamcommunity\.com\/profiles\/([^\/]+)/;

        let match = url.match(regexId);
        if (match && match[1]) {
            return match[1];
        }

        match = url.match(regexProfile);
        if (match && match[1]) {
            return match[1];
        }

        return null;
    };

    window.getCache = function () {
        let emporium_workshop_items = localStorage.getItem('tf2-emporium-tracker') || '{}'
        emporium_workshop_items = JSON.parse(emporium_workshop_items)

        return emporium_workshop_items
    }
    window.isCached = function (url) {
        const cache = getCache()

        return (url in cache)
    }
    window.getFromCache = function (url) {
        const cache = getCache()

        return cache[url]
    }
    window.cache = async function (url, steamid, flagged) {
        return new Promise((resolve) => {
            const cache = window.getCache()
            const cached = (url in cache)

            if (cached) {
                // Prioritizing 'flagged === true' over 'flagged === false'.
                if (cache[url]['flagged'] === false && flagged) {
                    cache[url]['flagged'] = flagged
                } else {
                    resolve()
                }
            } else {
                cache[url] = {
                    steam_id: steamid,
                    flagged: flagged
                }
            }

            localStorage.setItem('tf2-emporium-tracker', JSON.stringify(cache))
            return resolve()
        })
    }

    window.flagItem = function ($profile) {
        if ($profile.attr('flagged')) return

        // Flagging the element.
        $profile.attr('flagged', true)

        $profile.css('background', 'rgb(100, 0, 0)')
        $profile.css('opacity', '0.7')
        $profile.css('border', 'solid 1px red')
    }
    window.flagCreator = function ($profile, steamid) {
        $J(`<span style="color: red"> (${window.emporium_members[steamid]})</span>`).insertBefore($profile.find('br'))

        $profile.css('background', 'rgba(255, 0, 0, 0.2)')
    }
    window.flagPage = function () {
        if (window.is_page_flagged) return

        if (workshop_item_regex.test(current_url)) {
            window.is_page_flagged = true

            $J('.detailBox.plain').prepend($J(workshop_item_notification_html))

            $J('.workshopItemDetailsHeader').prepend(`<div class="workshopItemTitle" style="display: flex;align-items: center;color: rgba(255, 0, 0, 1);flex-direction: column;"><span style="text-align: center;/*! font-size: 24px; */">This Workshop Submission has been worked on by a criminal from the Emporium group. Please, do not vote for this submission.</span></div>`);
            $J('.workshop_item_header').css('background', 'rgba(255, 0, 0, 0.3)');
        }
    }

    window.markItemAsCached = function ($workshop_item) {
        $workshop_item.attr('cached', true)
    }

    // Method works only for
    //
    // https://steamcommunity.com/sharedfiles/filedetails/*
    // https://steamcommunity.com/id/*/myworkshopfiles/?appid=440*
    // https://steamcommunity.com/profiles/*/myworkshopfiles/?appid=440*
    window.checkWorkshopItem = async function () {
        const is_workshop_item = workshop_item_regex.test(current_url)
        const is_workshop_profile = workshop_profile_regex.test(current_url)
        if (!is_workshop_item && !is_workshop_profile) return

        if (window.isCached(current_url)) {
            const { flagged } = window.getFromCache(current_url)

            if (flagged) {
                console.log('(cached page) This is an Emporium item, flagging the page.')
                window.flagPage()
            } else {
                console.log('(cached page) This is not an Emporium item, skipping the page.')
                return // Skipping the creators since it's not an Emporium item.
            }
        }

        if (is_workshop_item) {
            for (let i = 0; i < $J('.friendBlock').length; i++) {
                const profile = $J('.friendBlock').get(i)
                const user_url = $J(profile).find('.friendBlockLinkOverlay').attr('href')

                if (window.isCached(user_url)) {
                    const { steam_id, flagged } = window.getFromCache(user_url)

                    if (flagged) {
                        console.log('(cached user) Found an Emporium member, flagging him and the page.')

                        window.flagCreator($J(profile), steam_id)
                        window.flagPage()

                        await window.cache(user_url, undefined, true)
                        await window.cache(current_url, undefined, true)
                    } else {
                        console.log('(cached user) Found a legit creator, skipping him.')
                        await window.cache(user_url, undefined, false)
                        await window.cache(current_url, undefined, false)
                    }

                    continue
                }

                // Getting the steam_id.
                try {
                    const response = await fetch(user_url);
                    const html = await response.text();
                    const object = getProfileObject(html);

                    const steam_id = object['steamid']
                    if (window.isEmporiumMember(steam_id)) {
                        console.log('Found a non-cached Emporium member, flagging him and the page.')

                        window.flagCreator($J(profile), steam_id)
                        window.flagPage()

                        await window.cache(user_url, steam_id, true)
                        await window.cache(current_url, undefined, true)
                    } else {
                        console.log('Found a legit creator, skipping him.')

                        await window.cache(user_url, steam_id, false)
                        await window.cache(current_url, undefined, false)
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                }
            }
        }

        if (workshop_profile_regex.test(current_url)) {
            let user_workshop_url = $J('#HeaderUserInfoName > a').attr('href');

            // Flagging cached user workshop url.
            if (getFromCache(user_workshop_url)) {
                return window.flagPage()
            }

            try {
                const response = await fetch(user_workshop_url);
                const html = await response.text();
                const object = getProfileObject(html);

                const steam_id = object['steamid']
                if (window.isEmporiumMember(steam_id)) {
                    await window.cache(user_workshop_url, undefined, true)
                    await window.cache(current_url, undefined, true)
                    window.flagPage()
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        }
    };

    window.checkWorkshopItems = async function () {
        const items = $J('.workshopItem')

        for (let i = 0; i < items.length; i++) {
            const $workshop_item = $J( items[i] )

            await window.flagWorkshopItemIfIncludesEmporiumMember($workshop_item)
            const is_cached = $workshop_item.attr('cached')

            if (!is_cached) await new Promise((res) => setTimeout(res, 100))
        }
    };

    window.flagWorkshopItemIfIncludesEmporiumMember = async function ($workshop_item) {
        const $ugc = $workshop_item.find('.ugc')
        const workshop_item_url = $ugc.attr('href')

        const $workshop_item_name = $workshop_item.find('.item_link').find('.workshopItemTitle')
        const workshop_item_name = $workshop_item_name.text()

        if (window.isCached(workshop_item_url)) {
            const { flagged } = window.getFromCache(workshop_item_url)

            if (flagged) {
                console.warn(`(cached item) '${workshop_item_name}' includes an Emporium member, flagging the item.`)
                window.flagItem($workshop_item)
            } else {
                console.log(`(cached item) '${workshop_item_name}' is legit, skipping the item.`)
            }

            window.markItemAsCached($workshop_item)
        } else {
            // Making a request to the page to get the creators list.
            const workshop_item_page_html = await fetch(workshop_item_url).then((res) => res.text())
            const $workshop_item_page_html = $J(workshop_item_page_html)

            const $creators_block = $workshop_item_page_html.find('.creatorsBlock')
            const $creators = $creators_block.find('.friendBlock') // I wonder why did they call creators as 'friends'.

            for (let i = 0; i < $creators.length; i++) {
                const $profile = $J( $creators.get(i) )
                const user_profile_url = $profile.find('.friendBlockLinkOverlay').attr('href')

                if (window.isCached(user_profile_url)) {
                    const { flagged } = window.getFromCache(user_profile_url)

                    if (flagged) {
                        console.warn(`(cached item) '${workshop_item_name}' includes an Emporium member, flagging the item.`)
                        window.flagItem($workshop_item)

                        await window.cache(workshop_item_url, undefined, true)
                        await window.cache(user_profile_url, undefined, true)
                    } else {
                        console.log(`(cached item) '${workshop_item_name}' is legit, skipping the item.`)

                        await window.cache(workshop_item_url, undefined, false)
                        await window.cache(user_profile_url, undefined, false)
                    }

                    window.markItemAsCached($workshop_item)
                } else {
                    // Making a request to the user page to get the steamid64.
                    const user_profile_page_html = await fetch(user_profile_url).then((res) => res.text())
                    const g_rgProfileData = window.getProfileObject(user_profile_page_html)

                    const { personaname, steamid } = g_rgProfileData

                    if (window.isEmporiumMember(steamid)) {
                        console.warn(`'${workshop_item_name}' includes '${personaname}' which is an Emporium member, flagging the item.`)
                        window.flagItem($workshop_item)

                        await window.cache(workshop_item_url, undefined, true)
                        await window.cache(user_profile_url, steamid, true)
                    } else {
                        console.log(`'${workshop_item_name}' includes '${personaname}' which is a legit creator, searching for the next creator.`)

                        await window.cache(workshop_item_url, undefined, false)
                        await window.cache(user_profile_url, steamid, false)
                    }

                    window.markItemAsCached($workshop_item)
                }
            }
        }
    }

    await (async () => {
        const is_workshop = workshop_regex.test(current_url) || workshop_profile_regex.test(current_url)
        const original_title = document.title

        let counter = 0
        const title_interval = setInterval(() => {
            document.title = 'Checking On Bad Actors' + '.'.repeat(counter)
            counter++

            if (counter > 3) counter = 0
        }, 500)

        if (is_workshop) {
            // Method works only for
            //
            // https://steamcommunity.com/workshop/browse/?appid=440&browsesort=trend&section=mtxitems
            await checkWorkshopItems()
        } else {
            // Method works only for
            //
            // https://steamcommunity.com/sharedfiles/filedetails/*
            // https://steamcommunity.com/id/*/myworkshopfiles/?appid=440*
            // https://steamcommunity.com/profiles/*/myworkshopfiles/?appid=440*
            await checkWorkshopItem()
        }

        clearInterval(title_interval)
        document.title = original_title
    })()
})();
