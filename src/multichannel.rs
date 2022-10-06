use crossbeam_channel::{unbounded, Receiver, SendError, Sender};

pub struct Multichannel<T: Copy> {
    senders: Vec<Sender<T>>,
}

impl<T: Copy> Multichannel<T> {
    pub fn new() -> Self {
        Multichannel { senders: vec![] }
    }

    pub fn get_receiver(&mut self) -> Receiver<T> {
        let (sender, receiver) = unbounded();
        self.senders.push(sender);
        receiver
    }

    pub fn send(&mut self, msg: &T) -> Result<(), SendError<T>> {
        for sender in self.senders.iter_mut() {
            sender.send(*msg)?;
        }

        Ok(())
    }
}
