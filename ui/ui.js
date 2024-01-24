
function requestLogin(newUrl) {
    
    
    // add https:// to url if not present
    if (!newUrl.startsWith("http")) {
        newUrl = "https://" + newUrl
    }

    // get server name from url
    var serverName = newUrl.split("/")[2]

    // remove trailing slash
    if (newUrl.endsWith("/")) {
        newUrl = newUrl.substring(0, newUrl.length - 1)
    }

    // remove "myprintcenter" from end of server name
    if (newUrl.includes("myprintcenter")) {
        newUrl = newUrl.substring(0, newUrl.length - 14)
    }


    var originalTabId
    // get current tab id
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        originalTabId = tabs[0].id
    })

    window.open(newUrl,'popUpWindow','height=500,width=600,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=yes, status=yes')

    // get tab id of new window
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {

        // onCompleted listener for requests from new window
        chrome.webRequest.onCompleted.addListener(function(details) {
            if (details.url.includes("/PharosAPI/logon") && details.statusCode == 200) {      

                // add printer to storage
                chrome.storage.sync.get("printers", function(data) {
                    var printers = data.printers
                    if (printers == undefined) {
                        printers = []
                    }
                    
                    // check if printer already exists
                    var exists = false
                    printers.forEach(function(printer) {
                        if (printer.serverName == serverName) {
                            exists = true
                        }
                    })

                    if (exists) {
                        alert('Printer added successfully!'); 
                        // close login window
                        chrome.tabs.remove(details.tabId)
                        return
                    }

                    printers.push({ name: serverName, serverName: serverName, show_after_upload: true })
                    chrome.storage.sync.set({printers: printers})

                    alert('Printer added successfully!');

                    // close login window
                    chrome.tabs.remove(details.tabId)
                })
            }
        }, {urls: [newUrl+"/*"]}, [])
    })

}

// load printers
function loadPrinters() {

    chrome.storage.sync.get("printers", function(data) {
        var printers = data.printers
        if (printers == undefined) {
            printers = []
        }
        
        printers.forEach(function(printer) {
            console.log(printer.show_after_upload)
            // printer.serverName = "a"
            const printerElement = `
                <div class="card mb-2" id="printer-${printer.serverName}">
                    <input type="text" class="form-control card-header" id="printer-name-${printer.serverName}" value="${printer.name}">
                    <div class="card-body">
                        <code>Server: ${printer.serverName}</code>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" id="close-upload-${printer.serverName}" ${printer.show_after_upload && "checked"}>
                            <label class="form-check-label" for="close-upload-${printer.serverName}">Show jobs after upload</label>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm mt-1" id="delete-printer-${printer.serverName}">Delete</button>
                        
                    </div>
                </div>
            `


            document.getElementById("printer-list").innerHTML += printerElement
        })

        // setup hooks
        printers.forEach(function(printer) {
            document.getElementById(`delete-printer-${printer.serverName}`).onclick = function() {
                chrome.storage.sync.get("printers", function(data) {
                    var printers = data.printers
                    if (printers == undefined) {
                        printers = []
                    }
                    
                    printers.forEach(function(p, index) {
                        if (p.serverName == printer.serverName) {
                            printers.splice(index, 1)
                        }
                    })

                    chrome.storage.sync.set({printers: printers})

                    // remove printer from list
                    document.getElementById(`printer-${printer.serverName}`).remove()
                })
            }

            document.getElementById(`printer-name-${printer.serverName}`).onchange = function() {
                chrome.storage.sync.get("printers", function(data) {
                    var printers = data.printers
                    if (printers == undefined) {
                        printers = []
                    }
                    
                    printers.forEach(function(p, index) {
                        if (p.serverName == printer.serverName) {
                            printers[index].name = document.getElementById(`printer-name-${printer.serverName}`).value
                        }
                    })

                    chrome.storage.sync.set({printers: printers})
                })
            }

            document.getElementById(`close-upload-${printer.serverName}`).onchange = function() {                
                chrome.storage.sync.get("printers", function(data) {
                    var printers = data.printers
                    if (printers == undefined) {
                        printers = []
                    }
                    
                    printers.forEach(function(p, index) {
                        if (p.serverName == printer.serverName) {
                            printers[index].show_after_upload = document.getElementById(`close-upload-${printer.serverName}`).checked
                        }
                    })
    
                    chrome.storage.sync.set({printers: printers})
                })
            }
        })

        // Add printer button
        document.getElementById("add-printer").onclick = function() {
            var newUrl = document.getElementById("new-printer-url").value
            requestLogin(newUrl)
        } 
    })

}

loadPrinters()