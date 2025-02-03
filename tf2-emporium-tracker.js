// ==UserScript==
// @name         TF2 Emporium Tracker
// @version      03.02.2025
// @description  A browser extension that notifies you if a TF2 Workshop item contains a member of Emporium group, helping you avoid their content.
// @author       https://steamcommunity.com/id/EurekaEffect/
// @match        https://steamcommunity.com/sharedfiles/filedetails/*
// @match        https://steamcommunity.com/id/*/myworkshopfiles/?appid=440*
// @match        https://steamcommunity.com/profiles/*/myworkshopfiles/?appid=440*
// @match        https://steamcommunity.com/workshop/browse/?appid=440*
// @grant        none
// ==/UserScript==

const emporium_source = 'https://raw.githubusercontent.com/EurekaEffect/TF2-Emporium-Tracker/refs/heads/main/emporium-members.json';

(async function() {
    'use strict';

    window.emporium_members = await fetch(emporium_source).then(async (response) => await response.json())
    window.is_page_flagged = false

    const workshop_item_regex = /^https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/.*$/
    const workshop_profile_regex = /^https:\/\/steamcommunity\.com\/(id|profiles)\/[^\/]+\/myworkshopfiles\/\?appid=440\d*$/
    const workshop_regex = /^https:\/\/steamcommunity\.com\/workshop\/browse\/\?appid=440.*$/

    const current_url = document.location.href

    window.isEmporiumMember = function (steam_id) {
        return window.emporium_members.includes(steam_id)
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
        let emporium_workshop_items = localStorage.getItem('tf2-emporium-tracker')
        emporium_workshop_items = !emporium_workshop_items ? [] : JSON.parse(emporium_workshop_items)

        return emporium_workshop_items
    }
    window.isCached = function (url) {
        const cache = getCache()
        const object = cache.find((object) => object['url'] === url)

        return !!object
    }
    window.getFromCache = function (url) {
        const cache = getCache()

        return cache.find((object) => object['url'] === url)
    }
    window.cache = function (url, flagged) {
        const cache = window.getCache()
        const object = cache.find((object) => object['url'] === url)

        if (object) {
            object['flagged'] = flagged
        } else {
            cache.push({
                url: url,
                flagged: flagged
            })
        }

        localStorage.setItem('tf2-emporium-tracker', JSON.stringify(cache))
    }

    window.flagItem = function ($profile) {
        $profile.css('background', 'rgba(255, 0, 0, 0.4)')
    }
    window.flagCreator = function ($profile) {
        $profile.css('background', 'rgba(255, 0, 0, 0.2)')
    }
    window.flagPage = function () {
        if (window.is_page_flagged) return

        if (workshop_item_regex.test(current_url)) {
            window.is_page_flagged = true

            $J('.workshopItemDetailsHeader').prepend(`<div class="workshopItemTitle" style="display: flex;align-items: center;color: rgba(255, 0, 0, 1);flex-direction: column;"><span>This Workshop Item includes a member of Emporium group.</span><a href="https://www.youtube.com/watch?v=tJ0u4dHJeac&amp;t" style="color: rgba(255, 0, 0, 1);text-decoration: underline;">Please, do not support this group and their items.</a></div>`);
            $J('.workshop_item_header').css('background', 'rgba(255, 0, 0, 0.2)');
        }

        if (workshop_profile_regex.test(current_url)) {
            window.is_page_flagged = true

            $J('.sharedfiles_header_ctn').append(`<div id="HeaderUserBreadcrumbs" style="display: flex;align-items: center;color: rgba(255, 0, 0, 1);flex-direction: column;"><span>This Workshop profile belongs to a member of the Emporium group.</span><a href="https://www.youtube.com/watch?v=tJ0u4dHJeac&amp;t" style="color: rgba(255, 0, 0, 1);text-decoration: underline;">Please, do not support this group and their items.</a></div>`);
            $J('#leftContents').css('background', 'rgba(255, 0, 0, 0.2)');
        }
    }

    // Method works only for
    //
    // https://steamcommunity.com/sharedfiles/filedetails/*
    // https://steamcommunity.com/id/*/myworkshopfiles/?appid=440*
    // https://steamcommunity.com/profiles/*/myworkshopfiles/?appid=440*
    window.flagIfEmporiumMember = async function () {
        const is_workshop_item = workshop_item_regex.test(current_url)
        const is_workshop_profile = workshop_profile_regex.test(current_url)
        if (!is_workshop_item && !is_workshop_profile) return

        if (window.isCached(current_url)) {
            const object = window.getFromCache(current_url)

            if (object['flagged']) {
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
                    const object = window.getFromCache(user_url)

                    if (object['flagged']) {
                        console.log('(cached user) Found an Emporium member, flagging him and the page.')

                        window.flagCreator($J(profile))
                        window.flagPage()

                        window.cache(user_url, true)
                        window.cache(current_url, true)
                    } else {
                        console.log('Found a legit creator, skipping him.')
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

                        window.flagCreator($J(profile))
                        window.flagPage()

                        window.cache(user_url, true)
                        window.cache(current_url, true)
                    } else {
                        console.log('Found a legit creator, skipping him.')

                        window.cache(user_url, false)
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
                    window.cache(user_workshop_url)
                    window.flagPage()
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        }
    };

    window.checkWorkshop = async function () {
        const items = $J('.workshopItem')

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const $author = $J(item).find('.workshop_author_link')
            const workshop_profile = $author.attr('href')
            const profile_id = parseProfileId(workshop_profile)

            const url = (workshop_profile.includes('/profiles/') ? 'https://steamcommunity.com/profiles/' : 'https://steamcommunity.com/id/') + profile_id

            if (window.isCached(url)) {
                const object = window.getFromCache(url)

                if (object['flagged']) {
                    console.log('(cached item) Found an Emporium item, flagging it.')
                    window.flagItem($J(item))
                } else {
                    console.log(`(cached item) Found a legit creator's item, skipping the page.`)
                }

                continue
            }

            try {
                const response = await fetch(url)
                const html = await response.text()
                const object = getProfileObject(html)

                const steam_id = object['steamid']

                if (window.isEmporiumMember(steam_id)) {
                    console.log('Found a non-cached Emporium member, flagging him and the page.')

                    window.flagItem($J(item))

                    window.cache(url, true)
                } else {
                    // TODO if 'legit', then open workshop item and check all of the creators.
                    console.log('Found a non-cached legit creator, skipping him.')

                    window.cache(url, false)
                }
            } catch (error) {
                console.error(`Error processing profile ${profile_id}:`, error)
            }

            await new Promise((res) => setTimeout(res, 100))
        }
    };

    (async () => {
        const is_workshop = workshop_regex.test(current_url)

        if (is_workshop) {
            await checkWorkshop()
        } else {
            await flagIfEmporiumMember()
        }
    })()
})();
