// ==UserScript==
// @name         TF2 Chickenman Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Notifies you if a TF2 Workshop item contains a member of Emporium group
// @author       YourName
// @match        *://steamcommunity.com/*
// @grant        none
// ==/UserScript==


const void_image = 'https://github.com/wurlmon/TF2-Chickenman-Tracker/blob/main/assets/chickenman.png?raw=true';
const thumbnail_1_image = 'https://github.com/wurlmon/TF2-Chickenman-Tracker/blob/main/assets/thumbnail_1.png?raw=true';
const thumbnail_2_image = 'https://github.com/wurlmon/TF2-Chickenman-Tracker/blob/main/assets/thumbnail_2.png?raw=true';

const workshop_item_notification_html = `
  <div class="detailBox altFooter" style="background: #222; padding: 16px;">
    <div class="workshopItemDescriptionTitle" style="font-family: 'Motiva Sans',Arial,Helvetica,sans-serif;color: white;font-size: 18px;display: flex;justify-content: center;">
      <span style="text-align: center;text-transform: none;">
        This Workshop submission has been worked on by a criminal. Below is evidence detailing the things they have done.
      </span>
    </div>
    <div class="workshopItemDescription" id="highlightContent" style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 12px;">
      <img src="${void_image}" alt="Chickenman" style="max-height: 100px;">
      <img src="${thumbnail_1_image}" alt="Thumbnail 1" style="max-height: 100px;">
      <img src="${thumbnail_2_image}" alt="Thumbnail 2" style="max-height: 100px;">
    </div>
  </div>
`;

(async function () {
    'use strict'

    window.$J = $J // Re-defining, so IDE won't cry about it.
    window.url = document.location.href

    window.is_page_flagged = false
    window.Chickenman_members = {
        '76561198039877070': 'Chickenman'
    }

    // Method returns an array of objects that contains the cached data of fetched workshop items.
    window.getCache = function () {
        let chickenman_workshop_items = localStorage.getItem('tf2-chickenman-tracker') || '{}'
        chickenman_workshop_items = JSON.parse(chickenman_workshop_items)

        return chickenman_workshop_items
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
                // so we can flag a cached person that works with Chickenman.
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

            localStorage.setItem('tf2-Chickenman-tracker', JSON.stringify(cache))
            return resolve()
        })
    }
    window.markItemAsCached = function ($workshop_item) {
        $workshop_item.attr('cached', true)
    }

    window.isChickenmanMember = function (steam_id) {
        return (steam_id in window.Chickenman_members)
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
        $J(`<span style="color: red"> (${window.Chickenman_members[steamid]})</span>`).insertBefore($profile.find('br'))

        $profile.css('background', 'rgba(255, 0, 0, 0.2)')
    }
    window.flagPage = function () {
        if (window.is_page_flagged) return

        window.is_page_flagged = true

        $J('.detailBox.plain').prepend($J(workshop_item_notification_html))

        $J('.workshopItemDetailsHeader').prepend(`<div class="workshopItemTitle" style="display: flex;align-items: center;color: rgba(255, 0, 0, 1);flex-direction: column;"><span style="text-align: center;/*! font-size: 24px; */">This Workshop Submission has been worked on by a criminal from the Chickenman group. Please, do not vote for this submission.</span></div>`);
        $J('.workshop_item_header').css('background', 'rgba(255, 0, 0, 0.3)');
    }

    window.getWorkshopItems = function () {
        const $workshop_items = {
            'div.workshop_item': [],
            'a.workshop_item_link': [],
            'div.workshopItem': [],
            'div.collectionItem': [],
            'a.workshopItemCollection': []
        }

        // Handling 'a.workshop_item_link'.
        const $div_workshop_items = $J('.workshop_item')
        $div_workshop_items.each((i, $workshop_item) => {
            const $workshop_item_link = $J($workshop_item).find('a.workshop_item_link')

            if ($workshop_item_link.length > 0) {
                $workshop_items['div.workshop_item'].push($workshop_item)
            }
        })

        // Handling 'div.workshop_item'.
        const $a_workshop_item_link  = $J('a.workshop_item_link')
        $a_workshop_item_link.each((i, $workshop_item) => {
            const $workshop_item_row = $J($workshop_item).find('div.workshop_item_row')

            if ($workshop_item_row.length > 0) {
                $workshop_items['a.workshop_item_link'].push($workshop_item)
            }
        })

        // Handling 'div.workshopItem'.
        const $div_workshopItem  = $J('div.workshopItem')
        $div_workshopItem.each((i, $workshop_item) => {
            const $a_ugc = $J($workshop_item).find('a.ugc')
            const $a_item_link = $J($workshop_item).find('a.item_link')
            const $div_workshopItemAuthorName = $J($workshop_item).find('div.workshopItemAuthorName ')

            if (($a_ugc.length > 0) && ($a_item_link.length > 0) && ($div_workshopItemAuthorName.length > 0)) {
                $workshop_items['div.workshopItem'].push($workshop_item)
            }
        })

        // Handling 'div.collectionItem'.
        const $div_collectionItem  = $J('div.collectionItem')
        $div_collectionItem.each((i, $workshop_item) => {
            const $div_workshopItem = $J($workshop_item).find('div.workshopItem')
            const $div_collectionItemDetails = $J($workshop_item).find('div.collectionItemDetails')

            if (($div_workshopItem.length > 0) && ($div_collectionItemDetails.length > 0)) {
                $workshop_items['div.collectionItem'].push($workshop_item)
            }
        })

        // Handling 'div.workshopItemCollection'.
        const $div_workshopItemCollection = $J('a.workshopItemCollection')
        $div_workshopItemCollection.each((i, $workshop_item) => {
            const $div_workshopItem = $J($workshop_item).find('div.workshopItem')
            const $div_workshopItemDetails = $J($workshop_item).find('div.workshopItemDetails')

            if (($div_workshopItem.length > 0) && ($div_workshopItemDetails.length > 0)) {
                $workshop_items['a.workshopItemCollection'].push($workshop_item)
            }
        })

        return $workshop_items
    }

    window.verifyItem = async function (class_name, $workshop_item) {
        $workshop_item = $J($workshop_item) // Just to be sure.

        let item_url;
        let item_name;

        // It works as intended, but God I hate it.
        switch (class_name) {
            case 'div.workshop_item': {
                item_url = $workshop_item.find('a.workshop_item_link.ugc').attr('href')
                if (!item_url) item_url = $workshop_item.find('a.workshop_item_link').attr('href')

                item_name = 'unknown' // There's no item name in that element.
                break
            }

            case 'a.workshop_item_link': {
                item_url = $workshop_item.attr('href')
                item_name = $workshop_item.find('div.workshop_item_row div.workshop_item_title.ellipsis').text()
                break
            }

            case 'div.workshopItem': {
                item_url = $workshop_item.find('a.ugc').attr('href')

                // The urls in the 'Accepted Items' page contain the query parameter &searchText= (why?).
                // We need to remove this parameter to avoid checking the page again if it is cached.
                if (item_url && item_url.includes('&')) {
                    item_url = item_url.split('&')[0]
                }

                item_name = $workshop_item.find('a.item_link div.workshopItemTitle.ellipsis').text()
                break
            }

            case 'div.collectionItem': {
                item_url = $workshop_item.find('div.workshopItem a').attr('href')
                item_name = $workshop_item.find('div.collectionItemDetails a div.workshopItemTitle').text()
                break
            }

            case 'a.workshopItemCollection': {
                item_url = $workshop_item.attr('href')
                item_name = $workshop_item.find('div.workshopItemDetails div.workshopItemTitle').text()
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
                console.warn(`(cached item) '${workshop_item_name}' includes Chickenman, flagging the item.`)
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
            const $creators = $creators_block.find('.friendBlock') // I wonder why did they call creators as 'friends', since he's got no friends'.

            for (let i = 0; i < $creators.length; i++) {
                const $profile = $J($creators.get(i))
                const user_profile_url = $profile.find('.friendBlockLinkOverlay').attr('href')

                if (window.isCached(user_profile_url)) {
                    const {flagged} = window.getFromCache(user_profile_url)

                    if (flagged) {
                        console.warn(`(cached item) '${workshop_item_name}' includes Chickenman, flagging the item.`)
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

                    if (window.isChickenmanMember(steamid)) {
                        console.warn(`'${workshop_item_name}' includes '${personaname}' which is an Chickenman member, flagging the item.`)
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
    window.verifyCreatorsOnThisPage = async function () {
        if (window.isCached(window.url)) {
            const {flagged} = window.getFromCache(window.url)

            if (flagged) {
                console.log('(cached page) This is a Chickenman item, flagging the page.')
                window.flagPage()
            } else {
                console.log('(cached page) This is not a Chickenman item, skipping the page.')
                return // Skipping the creators since it's not an Chickenman item.
            }
        }

        for (let i = 0; i < $J('.friendBlock').length; i++) {
            const profile = $J('.friendBlock').get(i)
            const user_url = $J(profile).find('.friendBlockLinkOverlay').attr('href')

            if (window.isCached(user_url)) {
                const {steam_id, flagged} = window.getFromCache(user_url)

                if (flagged) {
                    console.log('(cached user) Found Chickenman, flagging him and the page.')

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
                if (window.isChickenmanMember(steam_id)) {
                    console.log('Found non-cached Chickenman, flagging him and the page.')

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

    // Main code.
    await (async () => {
        const original_title = document.title

        // A constant that holds the method that we need.
        function workshop_validator() {
            return new Promise(async (resolve) => {
                // Covering all possible workshop item class names.
                // We are also skipping '.voting_queue_border div.workshop_item' because it has no url.
                const workshop_items = window.getWorkshopItems()

                for (let [class_name, $workshop_items] of Object.entries(workshop_items)) {
                    for (let i = 0; i < $workshop_items.length; i++) {
                        // Updating the title.
                        document.title = `[${i + 1}/${$workshop_items.length}] ${original_title}`

                        const $workshop_item = $J($workshop_items[i])

                        // Verifying the item, yeah.
                        // as the result the item will be marked as 'cached'.
                        // If it is, then we can skip unnecessary 100ms delay.
                        await window.verifyItem(class_name, $workshop_item)
                        const is_cached = $workshop_item.attr('cached')

                        if (!is_cached) {
                            await new Promise((resolve) => setTimeout(resolve, 100))
                        }
                    }
                }

                const $creators_block = $J('#rightContents .creatorsBlock')
                // If found, then it's a workshop item page.
                if ($creators_block.length > 0) {
                    await window.verifyCreatorsOnThisPage()
                }

                return resolve()
            })
        }

        // Starting the validator.
        await workshop_validator().then(() => {
            document.title = original_title
        })
    })()
})()
