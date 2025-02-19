// ==UserScript==
// @name         TF2 Emporium Tracker
// @version      19.02.2025 17:15
// @description  A browser extension that notifies you if a TF2 Workshop item contains a member of Emporium group, helping you avoid their content.
// @author       https://steamcommunity.com/id/EurekaEffect/
// @match        https://steamcommunity.com/*
// @grant        none
// ==/UserScript==

const void_image = 'https://github.com/EurekaEffect/TF2-Emporium-Tracker/blob/main/assets/void.png?raw=true';
const thumbnail_1_image = 'https://github.com/EurekaEffect/TF2-Emporium-Tracker/blob/main/assets/thumbnail_1.png?raw=true';
const thumbnail_2_image = 'https://github.com/EurekaEffect/TF2-Emporium-Tracker/blob/main/assets/thumbnail_2.png?raw=true';

const workshop_item_notification_html = `<div class="detailBox altFooter"><div class="workshopItemDescriptionTitle" style="font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;color: white;font-size: 18px;display: flex;"><span style="text-align: center;text-transform: none;">This Workshop submission has been worked on by a criminal. Below is evidence detailing the things they have done.</span></div><div class="workshopItemDescription" id="highlightContent"><div style="display: flex;justify-content: space-around;"><a class="bb_link" target="_blank" rel="" title="EXPOSING The Group That Ruined The TF2 Workshop" href="https://discord.com/channels/217585440457228290/292291925640216577/476822103706959885"><img src="${void_image}"></a></div><br><a href="https://discord.com/channels/217585440457228290/292291925640216577/476822103706959885" style=" display: flex;justify-content: space-around;font-size: 16px; color: skyblue; font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;">Discord Hyperlink to channel.</a><br><span style="font-size: 16px; color: white;font-family: &quot;Motiva Sans&quot;,Arial,Helvetica,sans-serif;display: flex;justify-content: space-around;"><div>Videos by <a href="https://www.youtube.com/@BigBoiGames" style="text-decoration: underline;">BigBoiGames</a>.</div></span><br><div style="display: flex;justify-content: space-evenly;gap: 1px;"><a class="bb_link" target="_blank" href="https://www.youtube.com/watch?v=nHGXvEFaA2o&amp;t" rel="" title="I made a video exposing the TF2 Workshop Monopoly. They responded."><img src="${thumbnail_2_image}" style="width: 110%;"></a><a class="bb_link" target="_blank" href="https://www.youtube.com/watch?v=tJ0u4dHJeac" rel="" title="EXPOSING The Group That Ruined The TF2 Workshop"><img src="${thumbnail_1_image}" style="width: 110%;"></a></div></div></div>`;
// const emporium_source = 'https://raw.githubusercontent.com/EurekaEffect/TF2-Emporium-Tracker/refs/heads/main/emporium-members.json';

(async function () {
    'use strict'

    window.$J = $J // Re-defining, so IDE won't cry about it.
    window.url = document.location.href

    window.is_page_flagged = false
    window.emporium_members = {
        '76561198043855981': 'Metabolic',
        '76561198011507712': 'Drew'
    }

    // Method returns an array of objects that contains the cached data of fetched workshop items.
    window.getCache = function () {
        let emporium_workshop_items = localStorage.getItem('tf2-emporium-tracker') || '{}'
        emporium_workshop_items = JSON.parse(emporium_workshop_items)

        return emporium_workshop_items
    }
    // Method checks if the passed url is already cached.
    window.isCached = function (url) {
        const cache = getCache()

        return (url in cache)
    }
    // Method returns the cached object by url.
    window.getFromCache = function (url) {
        const cache = getCache()

        return cache[url]
    }
    window.cache = async function (url, steamid, flagged) {
        return new Promise((resolve) => {
            const cache = window.getCache()
            const cached = (url in cache)

            if (cached) {
                // Prioritizing 'flagged === true' over 'flagged === false',
                // so we can flag a cached person that works with Emporium.
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

    const workshop_item_regex = /^https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/.*$/;
    const workshop_profile_regex = /^https:\/\/steamcommunity\.com\/(id|profiles)\/[^\/]+\/myworkshopfiles\/\?appid=440\d*.*$/;

    window.isEmporiumMember = function (steam_id) {
        return (steam_id in window.emporium_members)
    }
    window.getProfileObject = function (html) {
        let profileData = null;

        $J(html).find('script').each(function () {
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

    window.flagItem = function ($profile) {
        if ($profile.attr('flagged')) return

        // Flagging the element.
        $profile.attr('flagged', true)

        $profile.css('background', 'rgb(100, 0, 0)')
        $profile.css('opacity', '0.7')
        $profile.css('border', 'solid 1px red')

        // Removing the green outline if the item is accepted.
        const $images = $profile.find('.workshopItemPreviewImage.accepted')
        $images.each((i, $image) => {
            $J($image).css('border-width', 0)
        })
    }
    window.flagCreator = function ($profile, steamid) {
        $J(`<span style="color: red"> (${window.emporium_members[steamid]})</span>`).insertBefore($profile.find('br'))

        $profile.css('background', 'rgba(255, 0, 0, 0.2)')
    }
    window.flagPage = function () {
        if (window.is_page_flagged) return

        if (workshop_item_regex.test(window.url)) {
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
        const is_workshop_item = workshop_item_regex.test(window.url)
        const is_workshop_profile = workshop_profile_regex.test(window.url)
        if (!is_workshop_item && !is_workshop_profile) return

        if (window.isCached(window.url)) {
            const {flagged} = window.getFromCache(window.url)

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
                    const {steam_id, flagged} = window.getFromCache(user_url)

                    if (flagged) {
                        console.log('(cached user) Found an Emporium member, flagging him and the page.')

                        window.flagCreator($J(profile), steam_id)
                        window.flagPage()

                        await window.cache(user_url, undefined, true)
                        await window.cache(window.url, undefined, true)
                    } else {
                        console.log('(cached user) Found a legit creator, skipping him.')
                        await window.cache(user_url, undefined, false)
                        await window.cache(window.url, undefined, false)
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
                        await window.cache(window.url, undefined, true)
                    } else {
                        console.log('Found a legit creator, skipping him.')

                        await window.cache(user_url, steam_id, false)
                        await window.cache(window.url, undefined, false)
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                }
            }
        }

        if (workshop_profile_regex.test(window.url)) {
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
                    await window.cache(window.url, undefined, true)
                    window.flagPage()
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        }
    };

    window.checkWorkshopPage = async function () {
        const items = $J('.workshopItem')

        for (let i = 0; i < items.length; i++) {
            const $workshop_item = $J(items[i])

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
            const {flagged} = window.getFromCache(workshop_item_url)

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
                const $profile = $J($creators.get(i))
                const user_profile_url = $profile.find('.friendBlockLinkOverlay').attr('href')

                if (window.isCached(user_profile_url)) {
                    const {flagged} = window.getFromCache(user_profile_url)

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

                    const {personaname, steamid} = g_rgProfileData

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


    window.verifyItem = async function ($workshop_item) {
        $workshop_item = $J($workshop_item) // Just to be sure.

        // Getting the first class name.
        const item_class = $workshop_item.attr('class').split(' ')[0]

        let item_url;
        let item_name;

        switch (item_class) {
            case 'workshopItem': {
                const $ugc = $workshop_item.find('.ugc') // What does this name mean bru.
                item_url = $ugc.attr('href')

                const $workshop_item_name = $workshop_item.find('.item_link').find('.workshopItemTitle')
                item_name = $workshop_item_name.text()
                break
            }

            case 'workshop_item_link': {
                item_url = $workshop_item.attr('href')

                const $workshop_item_name = $workshop_item.find('.workshop_item_title')
                item_name = $workshop_item_name.text()
                break
            }

            case 'collectionItem': {
                const $a = $workshop_item.find('div.workshopItem a')
                item_url = $a.attr('href')

                const $workshop_item_name = $workshop_item.find('div.collectionItemDetails a div.workshopItemTitle')
                item_name = $workshop_item_name.text()
                break
            }

            case 'workshopItemCollection': {
                item_url = $workshop_item.attr('href')

                const $workshop_item_name = $workshop_item.find('div.workshopItemDetails div.workshopItemTitle')
                item_name = $workshop_item_name.text()
                break
            }
        }

        await openItemPageAndVerifyCreators($workshop_item, item_url, item_name)
    }
    window.openItemPageAndVerifyCreators = async function ($workshop_item, workshop_item_url, workshop_item_name) {
        if (!workshop_item_url && !workshop_item_name) {
            return window.markItemAsCached($workshop_item)
        }

        if (window.isCached(workshop_item_url)) {
            const {flagged} = window.getFromCache(workshop_item_url)

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
                const $profile = $J($creators.get(i))
                const user_profile_url = $profile.find('.friendBlockLinkOverlay').attr('href')

                if (window.isCached(user_profile_url)) {
                    const {flagged} = window.getFromCache(user_profile_url)

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

                    const {personaname, steamid} = g_rgProfileData

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

    // Main code.
    await (async () => {
        const original_title = document.title

        // A constant that holds the method that we need.
        function workshop_validator() {
            return new Promise(async (resolve) => {
                // Covering all possible workshop item class names.
                // We are also skipping '.voting_queue_border div.workshop_item' because it has no url.
                const $workshop_items = $J('.workshopItemCollection, .collectionItem, .workshopItem, .workshop_item_link')

                console.log('workshop items: ' + $workshop_items.length)

                if ($workshop_items.length > 0) {
                    for (let i = 0; i < $workshop_items.length; i++) {
                        document.title = `[${i + 1}/${$workshop_items.length}] ${original_title}`

                        const $workshop_item = $J($workshop_items[i])

                        // Verifying the item, yeah.
                        // as the result the item will be marked as 'cached'.
                        // If it is, then we can skip unnecessary 100ms delay.
                        await window.verifyItem($workshop_item)
                        const is_cached = $workshop_item.attr('cached')

                        if (!is_cached) {
                            await new Promise((resolve) => setTimeout(resolve, 100))
                        }
                    }
                } else {
                    // Checking if the page is item workshop page.
                    await window.checkWorkshopItem()
                }

                return resolve()
            })
        }

        // Starting the validator.
        await workshop_validator().then(() => document.title = original_title)
    })()
})()
