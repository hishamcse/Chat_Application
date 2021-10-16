const socket = io()

// elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('#send')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $sidebar = document.querySelector('.chat__sidebar')

// templates
const $messageTemplate = document.querySelector('#message-template').innerHTML;
const $locationTemplate = document.querySelector('#location-message-template').innerHTML;
const $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

// auto scrolling feature
const autoScroll = () => {
    // new message element
    const $newMessage = $messages.lastElementChild;

    // height of new message
    const $newMessageStyles = getComputedStyle($newMessage)
    const $newMessageMargin = parseInt($newMessageStyles.marginBottom);
    const $newMessageHeight = $newMessage.offsetHeight + $newMessageMargin;

    // visible height
    const visibleHeight = $messages.offsetHeight;

    // height of the message container
    const containerHeight = $messages.scrollHeight;

    // how far I have scrolled from top
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - $newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

// receive message
socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render($messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
})

// receive location
socket.on('locationMessage', (msg) => {
    console.log(msg)
    const html = Mustache.render($locationTemplate, {
        username: msg.username,
        url: msg.url,
        createdAt: moment(msg.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
})

// receive all users data of a room
socket.on('roomData', ({room, users}) => {
    console.log(room)
    console.log(users)
    const html = Mustache.render($sidebarTemplate, {
        room,
        users
    });
    $sidebar.innerHTML = html;
})

// transfer message
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value;
    socket.emit('sendMessage', message, (err) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (err) {
            return console.log(err)
        }
        console.log('Delivered!!')
    })
})

// share location
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert(`Your browser doesn't support geolocation`)
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, (err) => {
            $sendLocationButton.removeAttribute('disabled')

            if (err) {
                return console.log(err);
            }
            console.log('location shared!')
        })
    });
})

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
})